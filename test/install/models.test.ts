import assert from "node:assert/strict";
import test from "node:test";
import {
  CURATED_MODEL_REGISTRY,
  UnsupportedCuratedModelError,
  getCuratedModelByKey,
  getRecommendedDefaultModel,
  getRequiredGonkagateModelIds,
  getValidatedModels,
  isCuratedModelKey,
} from "../../src/constants/models.js";

test("curated registry contains exactly the v1 required validated models", () => {
  assert.equal(CURATED_MODEL_REGISTRY.length, 3);
  assert.deepEqual(getRequiredGonkagateModelIds(), [
    "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    "moonshotai/Kimi-K2.6",
    "minimaxai/minimax-m2.7",
  ]);
  assert.deepEqual(
    getValidatedModels().map((model) => model.id),
    getRequiredGonkagateModelIds(),
  );
});

test("curated registry records audit metadata for runtime selection", () => {
  const recommended = getRecommendedDefaultModel();

  assert.equal(recommended.key, "qwen3-235b-a22b-instruct-2507-fp8");
  assert.equal(
    CURATED_MODEL_REGISTRY.filter((model) => model.recommendedDefault).length,
    1,
  );

  for (const model of CURATED_MODEL_REGISTRY) {
    assert.equal(model.status, "validated");
    assert.equal(model.validationEvidenceDate, "2026-06-12");
    assert.ok(model.qwenCompatibilityNotes.length > 0);
    assert.ok(model.generationConfig);
  }
});

test("curated model key validation rejects arbitrary model ids", () => {
  assert.equal(isCuratedModelKey("minimax-m2.7"), true);
  assert.equal(isCuratedModelKey("minimaxai/minimax-m2.7"), false);

  assert.throws(
    () => getCuratedModelByKey("minimaxai/minimax-m2.7"),
    (error) =>
      error instanceof UnsupportedCuratedModelError &&
      error.code === "unsupported_curated_model",
  );
});
