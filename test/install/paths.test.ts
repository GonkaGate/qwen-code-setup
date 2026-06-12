import assert from "node:assert/strict";
import test from "node:test";
import type {
  InstallDependencies,
  PlatformFacts,
} from "../../src/install/deps.js";
import { resolveQwenPaths } from "../../src/install/paths.js";
import { createFakeInstallDependencies } from "./test-deps.js";

function withEnv(
  values: Readonly<Record<string, string | undefined>>,
): Pick<InstallDependencies, "env">["env"] {
  return {
    get: (name) => values[name],
    toObject: () => ({ ...values }),
  };
}

test("POSIX paths resolve user, project, system, state, and backups", async () => {
  const deps = createFakeInstallDependencies({
    fs: {
      ...createFakeInstallDependencies().fs,
      exists: async (path) => path === "/work/repo/.git",
    },
    platform: {
      platform: "linux",
      arch: "x64",
      pathDelimiter: ":",
      isWindows: false,
      homeDir: "/home/alice",
      tmpDir: "/tmp",
      cwd: "/work/repo/src",
    },
  });

  const paths = await resolveQwenPaths(deps);

  assert.equal(paths.platformKind, "linux");
  assert.equal(paths.cwd, "/work/repo/src");
  assert.equal(paths.projectRoot, "/work/repo");
  assert.equal(paths.userSettingsPath, "/home/alice/.qwen/settings.json");
  assert.equal(paths.projectSettingsPath, "/work/repo/.qwen/settings.json");
  assert.equal(paths.systemSettingsPath, "/etc/qwen-code/settings.json");
  assert.equal(
    paths.installStatePath,
    "/home/alice/.gonkagate/qwen-code/install-state.json",
  );
  assert.equal(
    paths.projectBackupDir,
    "/home/alice/.gonkagate/qwen-code/backups/project-settings",
  );
});

test("QWEN_HOME overrides the active user settings root", async () => {
  const deps = createFakeInstallDependencies({
    env: withEnv({ QWEN_HOME: "/custom/qwen" }),
    platform: {
      platform: "linux",
      arch: "x64",
      pathDelimiter: ":",
      isWindows: false,
      homeDir: "/home/alice",
      tmpDir: "/tmp",
      cwd: "/work/repo",
    },
  });

  const paths = await resolveQwenPaths(deps);

  assert.equal(paths.userSettingsPathSource, "qwen-home");
  assert.equal(paths.userSettingsPath, "/custom/qwen/settings.json");
});

test("system settings resolve for macOS, Windows, overrides, and WSL", async () => {
  const macPaths = await resolveQwenPaths(
    createFakeInstallDependencies({
      platform: {
        platform: "darwin",
        arch: "arm64",
        pathDelimiter: ":",
        isWindows: false,
        homeDir: "/Users/alice",
        tmpDir: "/tmp",
        cwd: "/Users/alice/repo",
      },
    }),
  );
  assert.equal(
    macPaths.systemSettingsPath,
    "/Library/Application Support/QwenCode/settings.json",
  );
  assert.equal(macPaths.platformKind, "macos");

  const windowsFacts: PlatformFacts = {
    platform: "win32",
    arch: "x64",
    pathDelimiter: ";",
    isWindows: true,
    homeDir: "C:\\Users\\Alice",
    tmpDir: "C:\\Temp",
    cwd: "C:\\repo\\sub",
  };
  const winPaths = await resolveQwenPaths(
    createFakeInstallDependencies({
      env: withEnv({
        qwen_code_system_settings_path: "D:\\Qwen\\system.json",
        qwen_code_system_defaults_path: "D:\\Qwen\\defaults.json",
      }),
      platform: windowsFacts,
    }),
  );
  assert.equal(winPaths.platformKind, "windows");
  assert.equal(winPaths.systemSettingsPath, "D:\\Qwen\\system.json");
  assert.equal(winPaths.systemDefaultsPath, "D:\\Qwen\\defaults.json");
  assert.equal(
    winPaths.userSettingsPath,
    "C:\\Users\\Alice\\.qwen\\settings.json",
  );

  const wslPaths = await resolveQwenPaths(
    createFakeInstallDependencies({
      env: withEnv({ WSL_DISTRO_NAME: "Ubuntu" }),
    }),
  );
  assert.equal(wslPaths.platformKind, "wsl");
  assert.equal(wslPaths.systemSettingsPath, "/etc/qwen-code/settings.json");
});

test("relative cwd resolves under home before git-root discovery", async () => {
  const deps = createFakeInstallDependencies({
    fs: {
      ...createFakeInstallDependencies().fs,
      exists: async (path) => path === "/home/alice/workspace/repo/.git",
    },
    platform: {
      platform: "linux",
      arch: "x64",
      pathDelimiter: ":",
      isWindows: false,
      homeDir: "/home/alice",
      tmpDir: "/tmp",
      cwd: "workspace/repo/subdir",
    },
  });

  const paths = await resolveQwenPaths(deps);

  assert.equal(paths.cwd, "/home/alice/workspace/repo/subdir");
  assert.equal(paths.projectRoot, "/home/alice/workspace/repo");
});
