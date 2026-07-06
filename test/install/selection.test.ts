import assert from "node:assert/strict";
import test from "node:test";
import { redactedJsonStringify } from "../../src/install/redact.js";
import { selectSetupModel } from "../../src/install/selection.js";
import {
  LIVE_MODELS_WITH_UNKNOWN,
  UNKNOWN_LIVE_MODEL,
} from "./model-fixtures.js";
import { createFakeInstallDependencies } from "./test-deps.js";

const LIVE_MODEL_CATALOG = {
  models: LIVE_MODELS_WITH_UNKNOWN,
  modelIds: LIVE_MODELS_WITH_UNKNOWN.map((model) => model.id),
};

test("--yes selects the first live model after availability", async () => {
  const result = await selectSetupModel(
    { yes: true },
    createFakeInstallDependencies(),
    LIVE_MODEL_CATALOG,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.selectedModelId,
      "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    );
    assert.equal(result.pickerRendered, false);
  }
});

test("explicit live model id selects that model after availability", async () => {
  const result = await selectSetupModel(
    { yes: false, modelKey: UNKNOWN_LIVE_MODEL.id },
    createFakeInstallDependencies(),
    LIVE_MODEL_CATALOG,
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.selectedModelId, UNKNOWN_LIVE_MODEL.id);
  }
});

test("interactive picker shows live names and ids", async () => {
  let pickerCalls = 0;
  let renderedChoices: readonly string[] = [];
  const available = await selectSetupModel(
    { yes: false },
    createFakeInstallDependencies({
      prompts: {
        secret: async () => "gp-secret",
        select: async (_message, choices) => {
          pickerCalls += 1;
          renderedChoices = choices;
          return choices[choices.length - 1];
        },
      },
    }),
    LIVE_MODEL_CATALOG,
  );

  assert.equal(available.ok, true);
  assert.equal(pickerCalls, 1);
  assert.ok(
    renderedChoices.includes("Future Network Model (future/network-model)"),
  );
  if (available.ok) {
    assert.equal(available.pickerRendered, true);
    assert.equal(available.selectedModelId, UNKNOWN_LIVE_MODEL.id);
  }
});

test("selection rejects unavailable live ids and redacts JSON summaries", async () => {
  const invalid = await selectSetupModel(
    { yes: false, modelKey: "raw/model-id" },
    createFakeInstallDependencies(),
    LIVE_MODEL_CATALOG,
  );
  const selected = await selectSetupModel(
    { yes: false, modelKey: UNKNOWN_LIVE_MODEL.id },
    createFakeInstallDependencies(),
    LIVE_MODEL_CATALOG,
  );

  assert.equal(invalid.ok, false);
  assert.equal(selected.ok, true);

  if (!invalid.ok && selected.ok) {
    assert.equal(invalid.blocker.code, "validated_models_unavailable");
    assert.doesNotMatch(redactedJsonStringify(selected.summary), /gp-/);
    assert.deepEqual(
      selected.summary.availableModels,
      LIVE_MODEL_CATALOG.modelIds,
    );
  }
});
