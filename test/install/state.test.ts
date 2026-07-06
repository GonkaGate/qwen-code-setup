import assert from "node:assert/strict";
import test from "node:test";
import { QWEN_CODE_SETUP_CONTRACT } from "../../src/constants/contract.js";
import {
  createInstallState,
  serializeInstallState,
} from "../../src/install/state.js";
import { LIVE_MODELS } from "./model-fixtures.js";

const LIVE_MODEL_IDS = LIVE_MODELS.map((model) => model.id);

test("install state records runtime ownership metadata", () => {
  const state = createInstallState({
    scope: "project",
    selectedModelId: "moonshotai/Kimi-K2.6",
    managedModelIds: LIVE_MODEL_IDS,
    userSettingsPath: "/home/alice/.qwen/settings.json",
    projectSettingsPath: "/repo/.qwen/settings.json",
    verifiedAt: "2026-06-12T00:00:00.000Z",
  });

  assert.equal(state.installerVersion, QWEN_CODE_SETUP_CONTRACT.packageVersion);
  assert.equal(state.auditedQwenVersion, "0.18.0");
  assert.equal(state.scope, "project");
  assert.equal(state.selectedModelId, "moonshotai/Kimi-K2.6");
  assert.deepEqual(state.managedModelIds, LIVE_MODEL_IDS);
  assert.equal(state.secretStoragePolicyVersion, 1);
  assert.match(
    serializeInstallState(state),
    /"selectedModelId": "moonshotai\/Kimi-K2.6"/,
  );
});
