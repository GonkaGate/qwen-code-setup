import type { GonkagateModel } from "../../src/install/gonkagate-client.js";

export const LIVE_MODELS = [
  { id: "qwen/qwen3-235b-a22b-instruct-2507-fp8", name: "Qwen3 235B" },
  { id: "moonshotai/Kimi-K2.6", name: "Kimi K2.6" },
  { id: "minimaxai/minimax-m2.7", name: "MiniMax M2.7" },
] satisfies readonly GonkagateModel[];

export const UNKNOWN_LIVE_MODEL = {
  id: "future/network-model",
  name: "Future Network Model",
} satisfies GonkagateModel;

export const LIVE_MODELS_WITH_UNKNOWN = [
  ...LIVE_MODELS,
  UNKNOWN_LIVE_MODEL,
] satisfies readonly GonkagateModel[];

export function modelsResponse(
  models: readonly GonkagateModel[] = LIVE_MODELS,
): string {
  return JSON.stringify({ data: models });
}
