import assert from "node:assert/strict";
import test from "node:test";
import { getRequiredGonkagateModelIds } from "../../src/constants/models.js";
import {
  evaluateQwenCompatibilityLayers,
  getQwenCompatibilityEvidence,
  mergeSettingsForCompatibilityProof,
  projectModelProvidersCanHideManagedCatalog,
} from "../../src/install/qwen-compatibility.js";

function userSettingsWithManagedModels(): Record<string, unknown> {
  return {
    modelProviders: {
      openai: getRequiredGonkagateModelIds().map((id) => ({
        id,
        baseUrl: "https://api.gonkagate.com/v1",
        envKey: "GONKAGATE_API_KEY",
      })),
    },
  };
}

test("compatibility evidence records the audited replacement risk", () => {
  const evidence = getQwenCompatibilityEvidence();

  assert.equal(evidence.auditedVersion, "0.18.0");
  assert.equal(evidence.verdict, "CONCERNS");
  assert.equal(evidence.evidenceSource, "docs/qwen-compatibility-audit.md");
  assert.equal(evidence.modelProvidersMergeStrategy, "replace");
  assert.equal(evidence.projectModelProvidersCanHideUserCatalog, true);
  assert.equal(evidence.authCommandRemoved, true);
});

test("trusted project modelProviders replace user modelProviders", () => {
  const merged = mergeSettingsForCompatibilityProof(
    userSettingsWithManagedModels(),
    {
      modelProviders: {
        openai: [{ id: "project-only/model" }],
      },
    },
    true,
  );

  assert.deepEqual(merged.modelProviders, {
    openai: [{ id: "project-only/model" }],
  });
  assert.equal(
    projectModelProvidersCanHideManagedCatalog(
      userSettingsWithManagedModels(),
      merged,
      true,
    ),
    true,
  );
});

test("project compatibility blocks trusted modelProviders override only", () => {
  const trusted = evaluateQwenCompatibilityLayers({
    userSettings: userSettingsWithManagedModels(),
    projectSettings: { modelProviders: { openai: [] } },
    trustedProject: true,
  });
  const untrusted = evaluateQwenCompatibilityLayers({
    userSettings: userSettingsWithManagedModels(),
    projectSettings: { modelProviders: { openai: [] } },
    trustedProject: false,
  });
  const activationOnly = evaluateQwenCompatibilityLayers({
    userSettings: userSettingsWithManagedModels(),
    projectSettings: {
      security: { auth: { selectedType: "openai" } },
      model: { name: "qwen/qwen3-235b-a22b-instruct-2507-fp8" },
    },
    trustedProject: true,
  });

  assert.equal(trusted.blocker?.code, "project_modelproviders_override");
  assert.equal(untrusted.blocker, undefined);
  assert.equal(activationOnly.blocker, undefined);
});
