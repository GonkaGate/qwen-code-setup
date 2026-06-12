export type CuratedModelStatus = "candidate" | "validated";

export interface CuratedModelGenerationConfig {
  readonly contextWindowSize?: number;
  readonly modalities?: Readonly<Record<string, boolean>>;
  readonly samplingParams?: Readonly<Record<string, number | string | boolean>>;
}

export interface CuratedModelRecord {
  readonly key: string;
  readonly id: string;
  readonly label: string;
  readonly status: CuratedModelStatus;
  readonly recommendedDefault: boolean;
  readonly validationEvidenceDate: string;
  readonly qwenCompatibilityNotes: readonly string[];
  readonly generationConfig?: CuratedModelGenerationConfig;
  readonly notes: readonly string[];
}

export const CURATED_MODEL_REGISTRY = [
  {
    key: "qwen3-235b-a22b-instruct-2507-fp8",
    id: "qwen/qwen3-235b-a22b-instruct-2507-fp8",
    label: "Qwen3 235B A22B Instruct FP8",
    status: "validated",
    recommendedDefault: true,
    validationEvidenceDate: "2026-06-12",
    qwenCompatibilityNotes: [
      "Audited against @qwen-code/qwen-code 0.18.0 modelProviders.openai[] using id, name, baseUrl, envKey, and optional generationConfig.",
      "Recommended default for --yes because it is the Qwen-native model in the curated GonkaGate set.",
    ],
    generationConfig: {
      modalities: {},
    },
    notes: [
      "Required GonkaGate model for v1; installer must confirm it is present in the authenticated /v1/models response before setup.",
    ],
  },
  {
    key: "kimi-k2.6",
    id: "moonshotai/Kimi-K2.6",
    label: "Kimi K2.6",
    status: "validated",
    recommendedDefault: false,
    validationEvidenceDate: "2026-06-12",
    qwenCompatibilityNotes: [
      "Audited against @qwen-code/qwen-code 0.18.0 modelProviders.openai[] using id, name, baseUrl, envKey, and optional generationConfig.",
      "Qwen Code's model defaults classify Kimi-family ids as text-only unless a provider generationConfig overrides modalities.",
    ],
    generationConfig: {
      modalities: {},
    },
    notes: [
      "Required GonkaGate model for v1; installer must confirm it is present in the authenticated /v1/models response before setup.",
    ],
  },
  {
    key: "minimax-m2.7",
    id: "minimaxai/minimax-m2.7",
    label: "MiniMax M2.7",
    status: "validated",
    recommendedDefault: false,
    validationEvidenceDate: "2026-06-12",
    qwenCompatibilityNotes: [
      "Audited against @qwen-code/qwen-code 0.18.0 modelProviders.openai[] using id, name, baseUrl, envKey, and optional generationConfig.",
      "Qwen Code's model defaults classify MiniMax M2-series ids as text-only unless a provider generationConfig overrides modalities.",
    ],
    generationConfig: {
      modalities: {},
    },
    notes: [
      "Required GonkaGate model for v1; installer must confirm it is present in the authenticated /v1/models response before setup.",
    ],
  },
] as const satisfies readonly CuratedModelRecord[];

export type CuratedModelRegistryRecord =
  (typeof CURATED_MODEL_REGISTRY)[number];

export type CuratedModelKey = (typeof CURATED_MODEL_REGISTRY)[number]["key"];

export class UnsupportedCuratedModelError extends Error {
  readonly code = "unsupported_curated_model";

  constructor(readonly modelKey: string) {
    super(`Unsupported curated model key: ${modelKey}`);
    this.name = "UnsupportedCuratedModelError";
  }
}

export function getValidatedModels(): CuratedModelRegistryRecord[] {
  return CURATED_MODEL_REGISTRY.filter((model) => model.status === "validated");
}

export function getCandidateModels(): CuratedModelRegistryRecord[] {
  return [...CURATED_MODEL_REGISTRY];
}

export function getRequiredGonkagateModelIds(): string[] {
  return CURATED_MODEL_REGISTRY.map((model) => model.id);
}

export function getRecommendedDefaultModel(): CuratedModelRegistryRecord {
  const recommended = CURATED_MODEL_REGISTRY.filter(
    (model) => model.recommendedDefault,
  );

  if (recommended.length !== 1) {
    throw new Error(
      `Expected exactly one recommended default model, found ${recommended.length}.`,
    );
  }

  return recommended[0];
}

export function getCuratedModelByKey(key: string): CuratedModelRegistryRecord {
  const model = CURATED_MODEL_REGISTRY.find(
    (candidate) => candidate.key === key,
  );

  if (model === undefined) {
    throw new UnsupportedCuratedModelError(key);
  }

  return model;
}

export function isCuratedModelKey(key: string): key is CuratedModelKey {
  return CURATED_MODEL_REGISTRY.some((model) => model.key === key);
}
