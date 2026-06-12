import assert from "node:assert/strict";
import test from "node:test";
import { redactedJsonStringify } from "../../src/install/redact.js";
import {
  applySecretEnvMutation,
  createSecretStoragePlan,
  summarizeSecretStoragePlan,
} from "../../src/install/secret-storage.js";
import { createFakeInstallDependencies } from "./test-deps.js";

test("secret storage plan targets only user settings env", () => {
  const deps = createFakeInstallDependencies();
  const plan = createSecretStoragePlan(
    { userSettingsPath: "/home/alice/.qwen/settings.json" },
    deps.platform,
    "project",
  );

  assert.equal(plan.scope, "project");
  assert.equal(plan.target.kind, "user-settings-env");
  assert.equal(plan.target.path, "/home/alice/.qwen/settings.json");
  assert.equal(plan.target.settingsPath, "env.GONKAGATE_API_KEY");
  assert.equal(plan.writesProjectFiles, false);
  assert.equal(plan.mutatesShellProfiles, false);
  assert.deepEqual(plan.posixPolicy, {
    directoryMode: 0o700,
    fileMode: 0o600,
  });
});

test("native Windows secret storage plan is profile scoped", () => {
  const plan = createSecretStoragePlan(
    { userSettingsPath: "C:\\Users\\Alice\\.qwen\\settings.json" },
    {
      platform: "win32",
      arch: "x64",
      pathDelimiter: ";",
      isWindows: true,
      homeDir: "C:\\Users\\Alice",
      tmpDir: "C:\\Temp",
      cwd: "C:\\repo",
    },
    "user",
  );

  assert.equal(plan.posixPolicy, undefined);
  assert.equal(plan.windowsPolicy?.userProfileScoped, true);
});

test("secret env mutation preserves unrelated settings and redacts previews", () => {
  const mutated = applySecretEnvMutation(
    {
      ui: { theme: "dark" },
      env: { OTHER_KEY: "keep" },
    },
    "gp-storage-secret",
  );
  const summary = summarizeSecretStoragePlan(
    createSecretStoragePlan(
      { userSettingsPath: "/home/alice/.qwen/settings.json" },
      createFakeInstallDependencies().platform,
      "user",
    ),
  );

  assert.deepEqual(mutated.ui, { theme: "dark" });
  assert.deepEqual(mutated.env, {
    OTHER_KEY: "keep",
    GONKAGATE_API_KEY: "gp-storage-secret",
  });
  assert.doesNotMatch(JSON.stringify(summary), /gp-storage-secret/);
  assert.doesNotMatch(redactedJsonStringify(mutated), /gp-storage-secret/);
  assert.match(redactedJsonStringify(mutated), /\[REDACTED\]/);
});
