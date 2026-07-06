import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";
import type { InstallDependencies } from "./deps.js";
import type { GonkagateModel, GonkagateModelList } from "./gonkagate-client.js";

export interface ModelSelectionRequest {
  readonly modelKey?: string;
  readonly yes: boolean;
}

export type ModelSelectionResult =
  | {
      readonly ok: true;
      readonly selectedModel: GonkagateModel;
      readonly selectedModelId: string;
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
  catalog: GonkagateModelList,
): Promise<ModelSelectionResult> {
  if (request.modelKey !== undefined) {
    return selectExplicitModel(request.modelKey, catalog, false);
  }

  if (request.yes) {
    return selectAvailableModel(catalog.models[0], catalog, false);
  }

  const selectedChoice = await deps.prompts.select(
    "GonkaGate model",
    catalog.models.map((model) => formatModelChoice(model)),
  );
  const selectedModel = catalog.models.find(
    (model) => formatModelChoice(model) === selectedChoice,
  );

  if (selectedModel === undefined) {
    return unavailableSelection(selectedChoice);
  }

  return selectAvailableModel(selectedModel, catalog, true);
}

function selectExplicitModel(
  modelId: string,
  catalog: GonkagateModelList,
  pickerRendered = false,
): ModelSelectionResult {
  const model = catalog.models.find((candidate) => candidate.id === modelId);

  if (model === undefined) {
    return unavailableSelection(modelId);
  }

  return selectAvailableModel(model, catalog, pickerRendered);
}

function selectAvailableModel(
  model: GonkagateModel,
  catalog: GonkagateModelList,
  pickerRendered: boolean,
): ModelSelectionResult {
  return {
    ok: true,
    selectedModel: model,
    selectedModelId: model.id,
    pickerRendered,
    summary: {
      selectedModel: model.id,
      selectedModelId: model.id,
      availableModels: catalog.modelIds,
    },
  };
}

function unavailableSelection(modelId: string): ModelSelectionResult {
  return {
    ok: false,
    blocker: createBlocker({
      code: "validated_models_unavailable",
      layer: "model-selection",
      message: `Requested model "${modelId}" was not returned by authenticated GonkaGate /v1/models.`,
      nextAction:
        "Choose one of the model ids returned by GonkaGate /v1/models.",
    }),
    pickerRendered: false,
  };
}

function formatModelChoice(model: GonkagateModel): string {
  return model.name === undefined || model.name === model.id
    ? model.id
    : `${model.name} (${model.id})`;
}
