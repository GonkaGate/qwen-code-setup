import assert from "node:assert/strict";
import test from "node:test";
import { QWEN_CODE_SETUP_CONTRACT } from "../../src/constants/contract.js";
import { getRequiredGonkagateModelIds } from "../../src/constants/models.js";
import {
  createInstallState,
  serializeInstallState,
} from "../../src/install/state.js";

test("install state records runtime ownership metadata", () => {
  const state = createInstallState({
    scope: "project",
    selectedModelKey: "kimi-k2.6",
    userSettingsPath: "/home/alice/.qwen/settings.json",
    projectSettingsPath: "/repo/.qwen/settings.json",
    verifiedAt: "2026-06-12T00:00:00.000Z",
  });

  assert.equal(state.installerVersion, QWEN_CODE_SETUP_CONTRACT.packageVersion);
  assert.equal(state.auditedQwenVersion, "0.18.0");
  assert.equal(state.scope, "project");
  assert.equal(state.selectedModelKey, "kimi-k2.6");
  assert.deepEqual(state.managedModelIds, getRequiredGonkagateModelIds());
  assert.equal(state.secretStoragePolicyVersion, 1);
  assert.match(serializeInstallState(state), /"selectedModelKey": "kimi-k2.6"/);
});
