import {
  getRequiredGonkagateModelIds,
  getValidatedModels,
  type CuratedModelRegistryRecord,
} from "../constants/models.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";

export interface AvailableModelCatalog {
  readonly requiredModels: readonly CuratedModelRegistryRecord[];
  readonly returnedModelIds: readonly string[];
  readonly ignoredModelIds: readonly string[];
  readonly pickerAllowed: true;
  readonly mayWrite: true;
}

export type ModelAvailabilityResult =
  | {
      readonly ok: true;
      readonly catalog: AvailableModelCatalog;
    }
  | {
      readonly ok: false;
      readonly blocker: InstallBlocker;
      readonly missingModelIds: readonly string[];
      readonly pickerAllowed: false;
      readonly mayWrite: false;
    };

export function enforceRequiredModelAvailability(
  returnedModelIds: readonly string[],
): ModelAvailabilityResult {
  const uniqueReturnedIds = [...new Set(returnedModelIds)];
  const requiredIds = getRequiredGonkagateModelIds();
  const missingModelIds = requiredIds.filter(
    (id) => !uniqueReturnedIds.includes(id),
  );

  if (missingModelIds.length > 0) {
    return {
      ok: false,
      blocker: createBlocker({
        code: "required_models_unavailable",
        layer: "model-discovery",
        message: `GonkaGate /v1/models did not return ${missingModelIds.length} required model id(s).`,
        nextAction:
          "Retry with a GonkaGate API key that has access to all required Qwen Code setup models.",
      }),
      missingModelIds,
      pickerAllowed: false,
      mayWrite: false,
    };
  }

  const validatedModels = getValidatedModels();
  const requiredModels = validatedModels.filter((model) =>
    requiredIds.includes(model.id),
  );

  return {
    ok: true,
    catalog: {
      requiredModels,
      returnedModelIds: uniqueReturnedIds,
      ignoredModelIds: uniqueReturnedIds.filter(
        (id) => !requiredIds.includes(id),
      ),
      pickerAllowed: true,
      mayWrite: true,
    },
  };
}
