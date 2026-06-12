import assert from "node:assert/strict";
import test from "node:test";
import { getValidatedModels } from "../../src/constants/models.js";
import { writeManagedQwenSettings } from "../../src/install/write.js";
import type { ResolvedQwenPaths } from "../../src/install/paths.js";
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

test("rerun updates managed model without duplicating catalog or deleting unrelated providers", async () => {
  const fs = createMemoryFileSystem();
  const deps = createFakeInstallDependencies({ fs });
  const base = {
    deps,
    paths: paths(),
    scope: "user" as const,
    secretValue: "gp-rerun-secret",
    models: getValidatedModels(),
  };

  const first = await writeManagedQwenSettings({
    ...base,
    selectedModelKey: "qwen3-235b-a22b-instruct-2507-fp8",
    selectedModelId: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
  });
  const firstSettings = JSON.parse(
    fs.files.get(paths().userSettingsPath) ?? "{}",
  ) as Record<string, unknown>;
  const openai = (
    (firstSettings.modelProviders as Record<string, unknown>)
      .openai as unknown[]
  ).concat({
    id: "unmanaged/model",
    baseUrl: "https://example.test/v1",
  });
  fs.files.set(
    paths().userSettingsPath,
    JSON.stringify({
      ...firstSettings,
      modelProviders: { openai },
    }),
  );

  const second = await writeManagedQwenSettings({
    ...base,
    selectedModelKey: "kimi-k2.6",
    selectedModelId: "moonshotai/Kimi-K2.6",
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (second.ok) {
    const settings = JSON.parse(
      fs.files.get(paths().userSettingsPath) ?? "{}",
    ) as Record<string, unknown>;
    const providers = (settings.modelProviders as Record<string, unknown>)
      .openai as Array<Record<string, unknown>>;
    assert.equal(
      providers.filter((provider) => provider.id === "unmanaged/model").length,
      1,
    );
    assert.equal(
      providers.filter((provider) =>
        String(provider.description).includes("Managed by"),
      ).length,
      3,
    );
    assert.equal(
      (settings.model as Record<string, unknown>).name,
      "moonshotai/Kimi-K2.6",
    );
  }
});
