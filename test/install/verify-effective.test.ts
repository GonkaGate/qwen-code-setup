import assert from "node:assert/strict";
import test from "node:test";
import { getValidatedModels } from "../../src/constants/models.js";
import type { FileSystemDeps } from "../../src/install/deps.js";
import type { ResolvedQwenPaths } from "../../src/install/paths.js";
import { verifyDurableInstall } from "../../src/install/verify-effective.js";
import { writeManagedQwenSettings } from "../../src/install/write.js";
import {
  createFakeInstallDependencies,
  createMemoryFileSystem,
} from "./test-deps.js";

function paths(): ResolvedQwenPaths {
  return {
    platformKind: "linux",
    cwd: "/repo",
    projectRoot: "/repo",
    userSettingsPath: "/home/alice/.qwen/settings.json",
    userSettingsPathSource: "default-home",
    projectSettingsPath: "/repo/.qwen/settings.json",
    systemSettingsPath: "/etc/qwen-code/settings.json",
    systemSettingsPathSource: "default",
    installStatePath: "/home/alice/.gonkagate/qwen-code/install-state.json",
    backupRootPath: "/home/alice/.gonkagate/qwen-code/backups",
    userBackupDir: "/home/alice/.gonkagate/qwen-code/backups/user-settings",
    projectBackupDir:
      "/home/alice/.gonkagate/qwen-code/backups/project-settings",
  };
}

test("durable verifier proves user-scope managed settings", async () => {
  const fs = createMemoryFileSystem();
  const deps = createFakeInstallDependencies({ fs });
  const write = await writeManagedQwenSettings({
    deps,
    paths: paths(),
    scope: "user",
    selectedModelKey: "kimi-k2.6",
    selectedModelId: "moonshotai/Kimi-K2.6",
    secretValue: "gp-verify-secret",
    models: getValidatedModels(),
  });
  const verification = await verifyDurableInstall({
    deps,
    paths: paths(),
    scope: "user",
    selectedModelId: "moonshotai/Kimi-K2.6",
  });

  assert.equal(write.ok, true);
  assert.equal(verification.ok, true);
});

test("durable verifier blocks missing provider, secret, auth, and model evidence", async () => {
  const deps = createFakeInstallDependencies({
    fs: createMemoryFileSystem({
      [paths().userSettingsPath]: JSON.stringify({
        modelProviders: { openai: [] },
        security: { auth: { selectedType: "oauth" } },
        model: { name: "other/model" },
      }),
    }),
  });
  const verification = await verifyDurableInstall({
    deps,
    paths: paths(),
    scope: "user",
    selectedModelId: "moonshotai/Kimi-K2.6",
  });

  assert.equal(verification.ok, false);
  if (!verification.ok) {
    assert.ok(
      verification.blockers.every(
        (blocker) => blocker.code === "verification_incomplete",
      ),
    );
    assert.ok(verification.blockers.length >= 5);
  }
});

test("durable verifier blocks project and system overrides", async () => {
  const fs = createMemoryFileSystem();
  const deps = createFakeInstallDependencies({ fs });
  await writeManagedQwenSettings({
    deps,
    paths: paths(),
    scope: "project",
    selectedModelKey: "qwen3-235b-a22b-instruct-2507-fp8",
    selectedModelId: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    secretValue: "gp-verify-secret",
    models: getValidatedModels(),
  });
  fs.files.set(
    paths().projectSettingsPath,
    JSON.stringify({
      modelProviders: { openai: [] },
      security: { auth: { selectedType: "openai" } },
      model: { name: "qwen/qwen3-235b-a22b-instruct-2507-fp8" },
    }),
  );
  fs.files.set(
    paths().systemSettingsPath,
    JSON.stringify({ model: { name: "system/model" } }),
  );

  const verification = await verifyDurableInstall({
    deps,
    paths: paths(),
    scope: "project",
    selectedModelId: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
  });

  assert.equal(verification.ok, false);
  if (!verification.ok) {
    assert.ok(
      verification.blockers.some(
        (blocker) => blocker.code === "project_modelproviders_override",
      ),
    );
    assert.ok(
      verification.blockers.some(
        (blocker) => blocker.code === "system_settings_override",
      ),
    );
  }
});

test("durable verifier fails closed on unreadable system settings and permission mismatch", async () => {
  const memory = createMemoryFileSystem({
    [paths().userSettingsPath]: JSON.stringify({
      modelProviders: {
        openai: [
          "qwen/qwen3-235b-a22b-instruct-2507-fp8",
          "moonshotai/Kimi-K2.6",
          "minimaxai/minimax-m2.7",
        ].map((id) => ({ id })),
      },
      security: { auth: { selectedType: "openai" } },
      model: { name: "moonshotai/Kimi-K2.6" },
      env: { GONKAGATE_API_KEY: "gp-secret" },
    }),
  });
  const fs: FileSystemDeps = {
    ...memory,
    exists: async (path) =>
      path === paths().systemSettingsPath || memory.files.has(path),
    readFile: async (path) => {
      if (path === paths().systemSettingsPath) {
        throw new Error("permission denied");
      }
      return memory.readFile(path);
    },
    stat: async (path) => {
      const stats = await memory.stat(path);
      return { ...stats, mode: 0o644 };
    },
  };
  const verification = await verifyDurableInstall({
    deps: createFakeInstallDependencies({ fs }),
    paths: paths(),
    scope: "user",
    selectedModelId: "moonshotai/Kimi-K2.6",
  });

  assert.equal(verification.ok, false);
  if (!verification.ok) {
    assert.ok(
      verification.blockers.some(
        (blocker) =>
          blocker.code === "verification_incomplete" &&
          blocker.layer === "system-settings",
      ),
    );
    assert.ok(
      verification.blockers.some(
        (blocker) =>
          blocker.code === "verification_incomplete" &&
          blocker.layer === "user-settings",
      ),
    );
  }
});
