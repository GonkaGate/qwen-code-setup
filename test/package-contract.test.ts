import assert from "node:assert/strict";
import test from "node:test";
import { QWEN_CODE_SETUP_CONTRACT } from "../src/constants/contract.js";
import {
  CURATED_MODEL_REGISTRY,
  UnsupportedCuratedModelError,
  getCuratedModelByKey,
  getRecommendedDefaultModel,
  getRequiredGonkagateModelIds,
  getValidatedModels,
} from "../src/constants/models.js";
import { assertMatchesAll, readText } from "./contract-helpers.js";

test("package metadata follows the public qwen-code-setup contract", () => {
  const packageJson = JSON.parse(readText("package.json")) as {
    name?: string;
    bin?: Record<string, string>;
    type?: string;
    engines?: { node?: string };
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  assert.equal(packageJson.name, QWEN_CODE_SETUP_CONTRACT.packageName);
  assert.equal(packageJson.type, "module");
  assert.equal(
    packageJson.bin?.["gonkagate-qwen-code"],
    "bin/gonkagate-qwen-code.js",
  );
  assert.equal(
    packageJson.bin?.["qwen-code-setup"],
    "bin/gonkagate-qwen-code.js",
  );
  assert.deepEqual(QWEN_CODE_SETUP_CONTRACT.binaryAliases, [
    "gonkagate-qwen-code",
    "qwen-code-setup",
  ]);
  for (const alias of QWEN_CODE_SETUP_CONTRACT.binaryAliases) {
    assert.equal(packageJson.bin?.[alias], "bin/gonkagate-qwen-code.js");
  }
  assert.equal(packageJson.engines?.node, ">=22.14.0");
  assert.ok(packageJson.dependencies?.commander);
  assert.ok(packageJson.dependencies?.["jsonc-parser"]);
  assert.ok(packageJson.dependencies?.["@inquirer/prompts"]);
  assert.ok(packageJson.devDependencies?.typescript);
  assert.ok(packageJson.devDependencies?.tsx);
  assert.ok(packageJson.devDependencies?.publint);
});

test("contract constants record shipped runtime state and Qwen Code baseline", () => {
  assert.equal(
    QWEN_CODE_SETUP_CONTRACT.publicEntrypoint,
    "npx @gonkagate/qwen-code-setup",
  );
  assert.equal(
    QWEN_CODE_SETUP_CONTRACT.qwenPackageName,
    "@qwen-code/qwen-code",
  );
  assert.equal(QWEN_CODE_SETUP_CONTRACT.qwenBinaryName, "qwen");
  assert.equal(QWEN_CODE_SETUP_CONTRACT.packageVersion, "0.1.0");
  assert.equal(QWEN_CODE_SETUP_CONTRACT.runtimeImplemented, true);
  assert.equal(QWEN_CODE_SETUP_CONTRACT.curatedRegistryPublished, true);
  assert.equal(QWEN_CODE_SETUP_CONTRACT.requiredGonkagateModelCount, 3);
  assert.equal(QWEN_CODE_SETUP_CONTRACT.latestAuditedQwenCodeVersion, "0.18.0");
  assert.equal(QWEN_CODE_SETUP_CONTRACT.qwenPackageNodeEngine, ">=22.0.0");
  assert.equal(
    QWEN_CODE_SETUP_CONTRACT.latestAuditedQwenCodeVerdict,
    "CONCERNS",
  );
  assert.equal(
    QWEN_CODE_SETUP_CONTRACT.qwenModelProvidersMergeStrategy,
    "replace",
  );
  assert.equal(QWEN_CODE_SETUP_CONTRACT.qwenAuthCommandRemoved, true);
  assert.equal(QWEN_CODE_SETUP_CONTRACT.qwenStatusSurface, "/doctor");
  assert.deepEqual(QWEN_CODE_SETUP_CONTRACT.qwenEnvPrecedence, [
    "CLI flags",
    "process.env",
    "first .env file",
    "settings.env",
  ]);
});

test("supported model registry publishes all three required GonkaGate models", () => {
  assert.equal(CURATED_MODEL_REGISTRY.length, 3);
  assert.ok(
    CURATED_MODEL_REGISTRY.every((model) => model.status === "validated"),
  );
  assert.deepEqual(
    CURATED_MODEL_REGISTRY.map((model) => model.id),
    [
      "qwen/qwen3-235b-a22b-instruct-2507-fp8",
      "moonshotai/Kimi-K2.6",
      "minimaxai/minimax-m2.7",
    ],
  );
  assert.deepEqual(
    getValidatedModels().map((model) => model.id),
    getRequiredGonkagateModelIds(),
  );
  assert.ok(
    CURATED_MODEL_REGISTRY.every(
      (model) =>
        model.validationEvidenceDate === "2026-06-12" &&
        model.qwenCompatibilityNotes.length > 0,
    ),
  );
  assert.equal(getRecommendedDefaultModel().id, CURATED_MODEL_REGISTRY[0].id);
  assert.equal(
    CURATED_MODEL_REGISTRY.filter((model) => model.recommendedDefault).length,
    1,
  );
});

test("curated model lookup rejects unsupported model keys", () => {
  assert.equal(
    getCuratedModelByKey("qwen3-235b-a22b-instruct-2507-fp8").id,
    "qwen/qwen3-235b-a22b-instruct-2507-fp8",
  );

  assert.throws(
    () => getCuratedModelByKey("custom/raw-model"),
    (error) =>
      error instanceof UnsupportedCuratedModelError &&
      error.code === "unsupported_curated_model" &&
      error.modelKey === "custom/raw-model",
  );
});

test("release configuration updates contract metadata", () => {
  const releaseConfig = readText("release-please-config.json");

  assertMatchesAll(releaseConfig, [
    /"release-type": "node"/,
    /"src\/constants\/contract\.ts"/,
  ]);
});
