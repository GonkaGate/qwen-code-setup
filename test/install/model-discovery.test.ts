import assert from "node:assert/strict";
import test from "node:test";
import { getRequiredGonkagateModelIds } from "../../src/constants/models.js";
import { enforceRequiredModelAvailability } from "../../src/install/model-discovery.js";

test("model discovery requires all curated model ids and ignores extras", () => {
  const result = enforceRequiredModelAvailability([
    ...getRequiredGonkagateModelIds(),
    "future/model",
  ]);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(
      result.catalog.requiredModels.map((model) => model.id),
      getRequiredGonkagateModelIds(),
    );
    assert.deepEqual(result.catalog.ignoredModelIds, ["future/model"]);
    assert.equal(result.catalog.pickerAllowed, true);
    assert.equal(result.catalog.mayWrite, true);
  }
});

test("model discovery blocks missing required models and disables picker/writes", () => {
  const result = enforceRequiredModelAvailability([
    "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    "future/model",
  ]);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.blocker.code, "required_models_unavailable");
    assert.deepEqual(result.missingModelIds, [
      "moonshotai/Kimi-K2.6",
      "minimaxai/minimax-m2.7",
    ]);
    assert.equal(result.pickerAllowed, false);
    assert.equal(result.mayWrite, false);
  }
});
