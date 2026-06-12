import assert from "node:assert/strict";
import test from "node:test";
import type { FileSystemDeps } from "../../src/install/deps.js";
import {
  writeManagedTextFile,
  type ManagedTextFilePlan,
} from "../../src/install/managed-files.js";
import { applyManagedWriteTransaction } from "../../src/install/managed-write-transaction.js";
import {
  createFakeInstallDependencies,
  createMemoryFileSystem,
} from "./test-deps.js";

test("managed file writer creates backups, skips unchanged content, and repairs mode", async () => {
  const chmodCalls: Array<{ path: string; mode: number }> = [];
  const fs = createMemoryFileSystem({ "/home/a/settings.json": "old" });
  const deps = createFakeInstallDependencies({
    fs: {
      ...fs,
      chmod: async (path, mode) => {
        chmodCalls.push({ path, mode });
      },
    },
  });
  const plan: ManagedTextFilePlan = {
    kind: "user-settings",
    path: "/home/a/settings.json",
    contents: "new",
    backupDir: "/home/a/.gonkagate/backups/user-settings",
    mode: 0o600,
  };

  const first = await writeManagedTextFile(
    deps.fs,
    deps.platform,
    plan,
    "2026-06-12T00:00:00.000Z",
  );
  const second = await writeManagedTextFile(
    deps.fs,
    deps.platform,
    plan,
    "2026-06-12T00:00:01.000Z",
  );

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (first.ok && second.ok) {
    assert.equal(first.result.changed, true);
    assert.equal(second.result.changed, false);
    assert.ok(first.result.backupPath?.includes("settings.json.bak"));
    assert.equal(fs.files.get("/home/a/settings.json"), "new");
    assert.equal(fs.files.get(first.result.backupPath ?? ""), "old");
    assert.deepEqual(chmodCalls.at(-1), {
      path: "/home/a/settings.json",
      mode: 0o600,
    });
  }
});

test("managed file writer enforces Windows user-profile target policy", async () => {
  const outcome = await writeManagedTextFile(
    createMemoryFileSystem(),
    {
      platform: "win32",
      arch: "x64",
      pathDelimiter: ";",
      isWindows: true,
      homeDir: "C:\\Users\\Alice",
      tmpDir: "C:\\Temp",
      cwd: "C:\\repo",
    },
    {
      kind: "user-settings",
      path: "D:\\Other\\settings.json",
      contents: "{}\n",
      requireUserProfile: true,
    },
    "2026-06-12T00:00:00.000Z",
  );

  assert.equal(outcome.ok, false);
  if (!outcome.ok) {
    assert.equal(outcome.blocker.code, "managed_write_failed");
  }
});

test("managed write transaction rolls back prior writes when a later write fails", async () => {
  const memory = createMemoryFileSystem({
    "/user/settings.json": "old-user",
    "/project/settings.json": "old-project",
  });
  const fs: FileSystemDeps = {
    ...memory,
    writeFile: async (path, contents, options) => {
      if (path === "/project/settings.json") {
        throw new Error("write denied");
      }
      await memory.writeFile(path, contents, options);
    },
  };
  const result = await applyManagedWriteTransaction(
    createFakeInstallDependencies({ fs }),
    [
      {
        kind: "user-settings",
        path: "/user/settings.json",
        contents: "new-user",
        backupDir: "/backup/user",
        mode: 0o600,
      },
      {
        kind: "project-settings",
        path: "/project/settings.json",
        contents: "new-project",
        backupDir: "/backup/project",
        mode: 0o600,
      },
    ],
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.blocker.code, "managed_write_failed");
    assert.equal(memory.files.get("/user/settings.json"), "old-user");
    assert.equal(memory.files.get("/project/settings.json"), "old-project");
    assert.equal(result.rollbackResults.length, 1);
  }
});

test("managed write transaction reports backup and rollback failures", async () => {
  const backupMemory = createMemoryFileSystem({
    "/user/settings.json": "old-user",
  });
  const backupFailure = await applyManagedWriteTransaction(
    createFakeInstallDependencies({
      fs: {
        ...backupMemory,
        writeFile: async (path, contents, options) => {
          if (path.includes("/backup/")) {
            throw new Error("backup denied");
          }
          await backupMemory.writeFile(path, contents, options);
        },
      },
    }),
    [
      {
        kind: "user-settings",
        path: "/user/settings.json",
        contents: "new-user",
        backupDir: "/backup/user",
        mode: 0o600,
      },
    ],
  );

  assert.equal(backupFailure.ok, false);
  if (!backupFailure.ok) {
    assert.equal(backupFailure.blocker.code, "managed_write_failed");
    assert.equal(backupMemory.files.get("/user/settings.json"), "old-user");
  }

  let rollbackPhase = false;
  const rollbackMemory = createMemoryFileSystem({
    "/user/settings.json": "old-user",
    "/project/settings.json": "old-project",
  });
  const rollbackFailure = await applyManagedWriteTransaction(
    createFakeInstallDependencies({
      fs: {
        ...rollbackMemory,
        writeFile: async (path, contents, options) => {
          if (path === "/project/settings.json") {
            rollbackPhase = true;
            throw new Error("project denied");
          }
          if (rollbackPhase && path === "/user/settings.json") {
            throw new Error("rollback denied");
          }
          await rollbackMemory.writeFile(path, contents, options);
        },
      },
    }),
    [
      {
        kind: "user-settings",
        path: "/user/settings.json",
        contents: "new-user",
        backupDir: "/backup/user",
        mode: 0o600,
      },
      {
        kind: "project-settings",
        path: "/project/settings.json",
        contents: "new-project",
        backupDir: "/backup/project",
        mode: 0o600,
      },
    ],
  );

  assert.equal(rollbackFailure.ok, false);
  if (!rollbackFailure.ok) {
    assert.equal(rollbackFailure.blocker.code, "managed_write_failed");
    assert.equal(rollbackFailure.rollbackBlocker?.code, "managed_write_failed");
    assert.equal(rollbackMemory.files.get("/user/settings.json"), "new-user");
  }
});
