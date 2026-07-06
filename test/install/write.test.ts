import assert from "node:assert/strict";
import test from "node:test";
import type { ResolvedQwenPaths } from "../../src/install/paths.js";
import { writeManagedQwenSettings } from "../../src/install/write.js";
import { createWriteTargetConfigPlans } from "../../src/install/write-target-config.js";
import {
  createFakeInstallDependencies,
  createMemoryFileSystem,
} from "./test-deps.js";
import { LIVE_MODELS, UNKNOWN_LIVE_MODEL } from "./model-fixtures.js";

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

test("write target plans create user settings and install state for user scope", async () => {
  const result = await createWriteTargetConfigPlans({
    deps: createFakeInstallDependencies(),
    paths: paths(),
    scope: "user",
    selectedModelId: UNKNOWN_LIVE_MODEL.id,
    secretValue: "gp-plan-secret",
    models: [...LIVE_MODELS, UNKNOWN_LIVE_MODEL],
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(
      result.plans.map((plan) => plan.kind),
      ["user-settings", "install-state"],
    );
    assert.match(result.plans[0].contents, /modelProviders/);
    assert.match(result.plans[0].contents, /future\/network-model/);
    assert.match(result.plans[0].contents, /GONKAGATE_API_KEY/);
    assert.match(result.plans[1].contents, /secretStoragePolicyVersion/);
  }
});

test("project scope writes activation only to project settings and stores project backups under user backup root", async () => {
  const result = await createWriteTargetConfigPlans({
    deps: createFakeInstallDependencies(),
    paths: paths(),
    scope: "project",
    selectedModelId: "moonshotai/Kimi-K2.6",
    secretValue: "gp-project-secret",
    models: LIVE_MODELS,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    const projectPlan = result.plans.find(
      (plan) => plan.kind === "project-settings",
    );
    assert.ok(projectPlan);
    assert.equal(projectPlan.backupDir, paths().projectBackupDir);
    assert.doesNotMatch(
      projectPlan.contents,
      /GONKAGATE_API_KEY|gp-project-secret/,
    );
    assert.match(projectPlan.contents, /moonshotai\/Kimi-K2\.6/);
  }
});

test("temp-home style managed write creates settings and skips unchanged rerun", async () => {
  const fs = createMemoryFileSystem();
  const deps = createFakeInstallDependencies({ fs });
  const baseInput = {
    deps,
    paths: paths(),
    scope: "user" as const,
    selectedModelId: "minimaxai/minimax-m2.7",
    secretValue: "gp-write-secret",
    models: LIVE_MODELS,
  };

  const first = await writeManagedQwenSettings(baseInput);
  const second = await writeManagedQwenSettings(baseInput);

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (first.ok && second.ok) {
    assert.equal(first.changed, true);
    assert.equal(second.changed, false);
    assert.match(
      fs.files.get(paths().userSettingsPath) ?? "",
      /minimaxai\/minimax-m2\.7/,
    );
    assert.match(fs.files.get(paths().installStatePath) ?? "", /minimax-m2\.7/);
  }
});

test("project modelProviders block write planning before project writes", async () => {
  const fs = createMemoryFileSystem({
    [paths().projectSettingsPath]: JSON.stringify({
      modelProviders: { openai: [] },
    }),
  });
  const result = await createWriteTargetConfigPlans({
    deps: createFakeInstallDependencies({ fs }),
    paths: paths(),
    scope: "project",
    selectedModelId: "moonshotai/Kimi-K2.6",
    secretValue: "gp-project-secret",
    models: LIVE_MODELS,
  });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.blockers[0].code, "project_modelproviders_override");
  }
});
