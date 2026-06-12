import {
  UnsupportedCuratedModelError,
  getCuratedModelByKey,
  getRecommendedDefaultModel,
  type CuratedModelKey,
  type CuratedModelRegistryRecord,
} from "../constants/models.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";
import type { InstallDependencies } from "./deps.js";
import type {
  AvailableModelCatalog,
  ModelAvailabilityResult,
} from "./model-discovery.js";

export interface ModelSelectionRequest {
  readonly modelKey?: string;
  readonly yes: boolean;
}

export type ModelSelectionResult =
  | {
      readonly ok: true;
      readonly selectedModel: CuratedModelRegistryRecord;
      readonly selectedModelKey: CuratedModelKey;
      readonly pickerRendered: boolean;
      readonly summary: Record<string, unknown>;
    }
  | {
      readonly ok: false;
      readonly blocker: InstallBlocker;
      readonly pickerRendered: false;
    };

export async function selectSetupModel(
  request: ModelSelectionRequest,
  deps: InstallDependencies,
  availability: ModelAvailabilityResult,
): Promise<ModelSelectionResult> {
  if (!availability.ok) {
    return {
      ok: false,
      blocker: availability.blocker,
      pickerRendered: false,
    };
  }

  const catalog = availability.catalog;

  if (request.modelKey !== undefined) {
    return selectExplicitModel(request.modelKey, catalog);
  }

  if (request.yes) {
    return selectAvailableModel(getRecommendedDefaultModel(), catalog, false);
  }

  const selectedKey = await deps.prompts.select(
    "GonkaGate model",
    catalog.requiredModels.map((model) => model.key),
  );

  return selectExplicitModel(selectedKey, catalog, true);
}

function selectExplicitModel(
  modelKey: string,
  catalog: AvailableModelCatalog,
  pickerRendered = false,
): ModelSelectionResult {
  try {
    return selectAvailableModel(
      getCuratedModelByKey(modelKey),
      catalog,
      pickerRendered,
    );
  } catch (error) {
    if (error instanceof UnsupportedCuratedModelError) {
      return {
        ok: false,
        blocker: createBlocker({
          code: "validated_models_unavailable",
          layer: "model-selection",
          message: `Unsupported curated model key "${error.modelKey}".`,
          nextAction:
            "Choose one of the curated model keys exposed by the setup registry.",
        }),
        pickerRendered: false,
      };
    }

    throw error;
  }
}

function selectAvailableModel(
  model: CuratedModelRegistryRecord,
  catalog: AvailableModelCatalog,
  pickerRendered: boolean,
): ModelSelectionResult {
  if (
    !catalog.requiredModels.some((candidate) => candidate.key === model.key)
  ) {
    return {
      ok: false,
      blocker: createBlocker({
        code: "required_models_unavailable",
        layer: "model-selection",
        message:
          "The selected curated model was not present in the authenticated model availability catalog.",
        nextAction:
          "Retry after GonkaGate /v1/models returns the full required model set.",
      }),
      pickerRendered: false,
    };
  }

  return {
    ok: true,
    selectedModel: model,
    selectedModelKey: model.key,
    pickerRendered,
    summary: {
      selectedModel: model.key,
      selectedModelId: model.id,
      supportedModels: catalog.requiredModels.map((candidate) => candidate.key),
      ignoredModelIds: catalog.ignoredModelIds,
    },
  };
}
