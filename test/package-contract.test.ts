import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { QWEN_CODE_SETUP_CONTRACT } from "../src/constants/contract.js";
import {
  assertMatchesAll,
  listRelativeFiles,
  readText,
  repoRoot,
} from "./contract-helpers.js";

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
  const packageJson = JSON.parse(readText("package.json")) as {
    version?: string;
  };

  assert.equal(
    QWEN_CODE_SETUP_CONTRACT.publicEntrypoint,
    "npx @gonkagate/qwen-code-setup",
  );
  assert.equal(
    QWEN_CODE_SETUP_CONTRACT.qwenPackageName,
    "@qwen-code/qwen-code",
  );
  assert.equal(QWEN_CODE_SETUP_CONTRACT.qwenBinaryName, "qwen");
  assert.equal(QWEN_CODE_SETUP_CONTRACT.packageVersion, packageJson.version);
  assert.equal(QWEN_CODE_SETUP_CONTRACT.runtimeImplemented, true);
  assert.equal(
    QWEN_CODE_SETUP_CONTRACT.modelCatalogSource,
    "authenticated /v1/models",
  );
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

test("runtime source cannot depend on a checked-in model registry", () => {
  const sourceRoot = resolve(repoRoot, "src");
  const runtimeSource = listRelativeFiles(sourceRoot)
    .map((path) => readFileSync(resolve(sourceRoot, path), "utf8"))
    .join("\n");

  assert.equal(existsSync(resolve(sourceRoot, "constants/models.ts")), false);
  assert.doesNotMatch(
    runtimeSource,
    /CURATED_MODEL_REGISTRY|getRequiredGonkagateModelIds|getValidatedModels|requiredGonkagateModelCount/,
  );
  assert.match(
    runtimeSource,
    /modelCatalogSource: "authenticated \/v1\/models"/,
  );
});

test("release configuration updates contract metadata", () => {
  const releaseConfig = readText("release-please-config.json");

  assertMatchesAll(releaseConfig, [
    /"release-type": "node"/,
    /"src\/constants\/contract\.ts"/,
  ]);
});
