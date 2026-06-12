import assert from "node:assert/strict";
import test from "node:test";
import { redactedJsonStringify } from "../../src/install/redact.js";
import { enforceRequiredModelAvailability } from "../../src/install/model-discovery.js";
import { selectSetupModel } from "../../src/install/selection.js";
import { getRequiredGonkagateModelIds } from "../../src/constants/models.js";
import { createFakeInstallDependencies } from "./test-deps.js";

test("--yes selects the recommended validated default after availability", async () => {
  const result = await selectSetupModel(
    { yes: true },
    createFakeInstallDependencies(),
    enforceRequiredModelAvailability(getRequiredGonkagateModelIds()),
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.selectedModelKey, "qwen3-235b-a22b-instruct-2507-fp8");
    assert.equal(result.pickerRendered, false);
  }
});

test("explicit curated model key selects that model after availability", async () => {
  const result = await selectSetupModel(
    { yes: false, modelKey: "minimax-m2.7" },
    createFakeInstallDependencies(),
    enforceRequiredModelAvailability(getRequiredGonkagateModelIds()),
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.selectedModelKey, "minimax-m2.7");
  }
});

test("interactive picker runs only after authenticated availability succeeds", async () => {
  let pickerCalls = 0;
  const available = await selectSetupModel(
    { yes: false },
    createFakeInstallDependencies({
      prompts: {
        secret: async () => "gp-secret",
        select: async (_message, choices) => {
          pickerCalls += 1;
          return choices[1];
        },
      },
    }),
    enforceRequiredModelAvailability(getRequiredGonkagateModelIds()),
  );
  const unavailable = await selectSetupModel(
    { yes: false },
    createFakeInstallDependencies({
      prompts: {
        secret: async () => "gp-secret",
        select: async (_message, choices) => {
          pickerCalls += 1;
          return choices[0];
        },
      },
    }),
    enforceRequiredModelAvailability([
      "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    ]),
  );

  assert.equal(available.ok, true);
  assert.equal(unavailable.ok, false);
  assert.equal(pickerCalls, 1);
  if (available.ok && !unavailable.ok) {
    assert.equal(available.pickerRendered, true);
    assert.equal(unavailable.pickerRendered, false);
    assert.equal(unavailable.blocker.code, "required_models_unavailable");
  }
});

test("selection rejects invalid curated keys and redacts JSON summaries", async () => {
  const invalid = await selectSetupModel(
    { yes: false, modelKey: "raw/model-id" },
    createFakeInstallDependencies(),
    enforceRequiredModelAvailability(getRequiredGonkagateModelIds()),
  );
  const selected = await selectSetupModel(
    { yes: true },
    createFakeInstallDependencies(),
    enforceRequiredModelAvailability([
      ...getRequiredGonkagateModelIds(),
      "future/model",
    ]),
  );

  assert.equal(invalid.ok, false);
  assert.equal(selected.ok, true);

  if (!invalid.ok && selected.ok) {
    assert.equal(invalid.blocker.code, "validated_models_unavailable");
    assert.doesNotMatch(redactedJsonStringify(selected.summary), /gp-/);
    assert.deepEqual(selected.summary.ignoredModelIds, ["future/model"]);
  }
});
