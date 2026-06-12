import assert from "node:assert/strict";
import test from "node:test";
import { getValidatedModels } from "../../src/constants/models.js";
import { InstallerError } from "../../src/install/errors.js";
import { parseJsoncObject } from "../../src/install/jsonc.js";
import {
  mutateProjectActivationSettings,
  mutateUserSettings,
} from "../../src/install/managed-config-mutations.js";
import { createManagedProviderEntries } from "../../src/install/managed-provider-config.js";
import { readQwenSettings } from "../../src/install/qwen-settings.js";
import { createMemoryFileSystem } from "./test-deps.js";

test("Qwen settings parser covers missing, JSONC, malformed, and non-object input", async () => {
  const fs = createMemoryFileSystem({
    "/valid.json": '{\n  // comment\n  "ui": {"theme": "dark",},\n}\n',
    "/malformed.json": "{",
    "/array.json": "[]",
  });

  assert.deepEqual(await readQwenSettings(fs, "/missing.json"), {});
  assert.deepEqual(await readQwenSettings(fs, "/valid.json"), {
    ui: { theme: "dark" },
  });

  await assert.rejects(
    () => readQwenSettings(fs, "/malformed.json"),
    (error) =>
      error instanceof InstallerError && error.code === "settings_parse_failed",
  );
  assert.throws(
    () => parseJsoncObject("[]", "/array.json"),
    (error) =>
      error instanceof InstallerError && error.code === "settings_parse_failed",
  );
});

test("managed user mutation preserves unrelated settings and writes all managed fields", () => {
  const result = mutateUserSettings(
    {
      ui: { theme: "dark" },
      mcpServers: { local: {} },
      modelProviders: {
        openai: [{ id: "unmanaged/model", baseUrl: "https://example.test" }],
      },
    },
    {
      selectedModelId: "minimaxai/minimax-m2.7",
      secretValue: "gp-user-secret",
      models: getValidatedModels(),
    },
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.settings.ui, { theme: "dark" });
    assert.deepEqual(result.settings.mcpServers, { local: {} });
    assert.equal(
      getPath(result.settings, ["security", "auth", "selectedType"]),
      "openai",
    );
    assert.equal(
      getPath(result.settings, ["model", "name"]),
      "minimaxai/minimax-m2.7",
    );
    assert.equal(
      getPath(result.settings, ["env", "GONKAGATE_API_KEY"]),
      "gp-user-secret",
    );
    const providers = getOpenAiProviders(result.settings);
    assert.equal(providers.length, 4);
    for (const managed of createManagedProviderEntries()) {
      assert.ok(providers.some((provider) => provider.id === managed.id));
    }
  }
});

test("managed user mutation replaces prior managed entries without duplicates", () => {
  const previous = mutateUserSettings(
    {},
    {
      selectedModelId: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
      secretValue: "gp-old",
      models: getValidatedModels(),
    },
  );

  assert.equal(previous.ok, true);

  if (previous.ok) {
    const rerun = mutateUserSettings(previous.settings, {
      selectedModelId: "moonshotai/Kimi-K2.6",
      secretValue: "gp-new",
      models: getValidatedModels(),
    });

    assert.equal(rerun.ok, true);
    if (rerun.ok) {
      const providers = getOpenAiProviders(rerun.settings);
      assert.equal(providers.length, 3);
      assert.equal(
        getPath(rerun.settings, ["model", "name"]),
        "moonshotai/Kimi-K2.6",
      );
      assert.equal(
        getPath(rerun.settings, ["env", "GONKAGATE_API_KEY"]),
        "gp-new",
      );
    }
  }
});

test("same-id unmanaged provider conflict blocks mutation", () => {
  const result = mutateUserSettings(
    {
      modelProviders: {
        openai: [
          {
            id: "minimaxai/minimax-m2.7",
            baseUrl: "https://other.example/v1",
            envKey: "OTHER_KEY",
          },
        ],
      },
    },
    {
      selectedModelId: "minimaxai/minimax-m2.7",
      secretValue: "gp-secret",
      models: getValidatedModels(),
    },
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.blocker.code, "model_conflict");
  }
});

test("project activation mutation writes no secrets and blocks modelProviders", () => {
  const activation = mutateProjectActivationSettings(
    { hooks: { pre: "keep" } },
    "qwen/qwen3-235b-a22b-instruct-2507-fp8",
  );
  const blocked = mutateProjectActivationSettings(
    { modelProviders: { openai: [] } },
    "qwen/qwen3-235b-a22b-instruct-2507-fp8",
  );

  assert.equal(activation.ok, true);
  assert.equal(blocked.ok, false);

  if (activation.ok && !blocked.ok) {
    assert.deepEqual(activation.settings.hooks, { pre: "keep" });
    assert.equal(
      getPath(activation.settings, ["env", "GONKAGATE_API_KEY"]),
      undefined,
    );
    assert.equal(
      getPath(activation.settings, ["security", "auth", "selectedType"]),
      "openai",
    );
    assert.equal(blocked.blocker.code, "project_modelproviders_override");
  }
});

function getOpenAiProviders(
  settings: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const modelProviders = getPath(settings, ["modelProviders"]);
  if (
    modelProviders === undefined ||
    typeof modelProviders !== "object" ||
    modelProviders === null
  ) {
    return [];
  }
  const openai = (modelProviders as Record<string, unknown>).openai;
  return Array.isArray(openai)
    ? (openai as Array<Record<string, unknown>>)
    : [];
}

function getPath(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}
