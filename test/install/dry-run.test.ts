import assert from "node:assert/strict";
import test from "node:test";
import { getValidatedModels } from "../../src/constants/models.js";
import { createDryRunPlanSummary } from "../../src/install/dry-run.js";
import { createWriteTargetConfigPlans } from "../../src/install/write-target-config.js";
import {
  createFakeInstallDependencies,
  createMemoryFileSystem,
} from "./test-deps.js";
import type { ResolvedQwenPaths } from "../../src/install/paths.js";

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

test("dry-run summarizes planned writes without touching filesystem or leaking secrets", async () => {
  let writes = 0;
  const fs = createMemoryFileSystem();
  const result = await createWriteTargetConfigPlans({
    deps: createFakeInstallDependencies({
      fs: {
        ...fs,
        writeFile: async (...args) => {
          writes += 1;
          await fs.writeFile(...args);
        },
      },
    }),
    paths: paths(),
    scope: "project",
    selectedModelKey: "kimi-k2.6",
    selectedModelId: "moonshotai/Kimi-K2.6",
    secretValue: "gp-dry-run-secret",
    models: getValidatedModels(),
  });

  assert.equal(result.ok, true);
  assert.equal(writes, 0);

  if (result.ok) {
    const summary = createDryRunPlanSummary("project", result.plans);

    assert.equal(summary.changed, false);
    assert.deepEqual(
      summary.managedPaths.map((path) => path.kind),
      ["user-settings", "project-settings", "install-state"],
    );
    assert.doesNotMatch(JSON.stringify(summary), /gp-dry-run-secret/);
    assert.match(JSON.stringify(summary), /\[REDACTED\]/);
  }
});
