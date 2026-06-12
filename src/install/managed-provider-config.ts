import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import {
  getValidatedModels,
  type CuratedModelRegistryRecord,
} from "../constants/models.js";

export const MANAGED_PROVIDER_DESCRIPTION =
  "Managed by @gonkagate/qwen-code-setup";

export interface ManagedOpenAiProviderEntry {
  readonly id: string;
  readonly name: string;
  readonly baseUrl: string;
  readonly description: string;
  readonly envKey: string;
  readonly generationConfig?: unknown;
}

export function createManagedProviderEntries(
  models: readonly CuratedModelRegistryRecord[] = getValidatedModels(),
): ManagedOpenAiProviderEntry[] {
  return models.map((model) => ({
    id: model.id,
    name: `${model.label} via GonkaGate`,
    baseUrl: QWEN_CODE_SETUP_CONTRACT.canonicalBaseUrl,
    description: MANAGED_PROVIDER_DESCRIPTION,
    envKey: QWEN_CODE_SETUP_CONTRACT.qwenEnvKey,
    ...(model.generationConfig === undefined
      ? {}
      : { generationConfig: model.generationConfig }),
  }));
}

export function isManagedProviderEntry(value: unknown): boolean {
  const entry = toRecord(value);

  return (
    entry.baseUrl === QWEN_CODE_SETUP_CONTRACT.canonicalBaseUrl &&
    entry.envKey === QWEN_CODE_SETUP_CONTRACT.qwenEnvKey &&
    typeof entry.description === "string" &&
    entry.description.includes(MANAGED_PROVIDER_DESCRIPTION)
  );
}

export function hasProviderConflict(
  existing: unknown,
  managed: ManagedOpenAiProviderEntry,
): boolean {
  const entry = toRecord(existing);

  if (entry.id !== managed.id) {
    return false;
  }

  if (isManagedProviderEntry(entry)) {
    return false;
  }

  return (
    entry.baseUrl !== managed.baseUrl ||
    entry.envKey !== managed.envKey ||
    entry.description !== managed.description
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
