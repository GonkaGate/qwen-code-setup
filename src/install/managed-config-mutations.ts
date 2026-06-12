import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import type { CuratedModelRegistryRecord } from "../constants/models.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";
import {
  createManagedProviderEntries,
  hasProviderConflict,
  isManagedProviderEntry,
} from "./managed-provider-config.js";
import { applySecretEnvMutation } from "./secret-storage.js";

export interface ConfigMutationResult {
  readonly ok: true;
  readonly settings: Record<string, unknown>;
}

export interface ConfigMutationBlocked {
  readonly ok: false;
  readonly blocker: InstallBlocker;
}

export type ManagedConfigMutationResult =
  | ConfigMutationResult
  | ConfigMutationBlocked;

export function mutateUserSettings(
  settings: unknown,
  options: {
    readonly selectedModelId: string;
    readonly secretValue: string;
    readonly models: readonly CuratedModelRegistryRecord[];
  },
): ManagedConfigMutationResult {
  const root = toRecord(settings);
  const managedEntries = createManagedProviderEntries(options.models);
  const providerMutation = mergeManagedOpenAiProviders(root, managedEntries);

  if (!providerMutation.ok) {
    return providerMutation;
  }

  const withSecret = applySecretEnvMutation(
    {
      ...root,
      modelProviders: {
        ...toRecord(root.modelProviders),
        openai: providerMutation.openaiProviders,
      },
      security: {
        ...toRecord(root.security),
        auth: {
          ...toRecord(toRecord(root.security).auth),
          selectedType: QWEN_CODE_SETUP_CONTRACT.qwenAuthType,
        },
      },
      model: {
        ...toRecord(root.model),
        name: options.selectedModelId,
      },
    },
    options.secretValue,
  );

  return {
    ok: true,
    settings: withSecret,
  };
}

export function mutateProjectActivationSettings(
  settings: unknown,
  selectedModelId: string,
): ManagedConfigMutationResult {
  const root = toRecord(settings);

  if (Object.prototype.hasOwnProperty.call(root, "modelProviders")) {
    return {
      ok: false,
      blocker: createBlocker({
        code: "project_modelproviders_override",
        layer: "project-settings",
        path: QWEN_CODE_SETUP_CONTRACT.qwenWorkspaceSettingsPath,
        message:
          "Project settings define modelProviders; project activation cannot safely hide the user-managed GonkaGate catalog.",
        nextAction:
          "Remove project modelProviders or use user scope before retrying.",
      }),
    };
  }

  return {
    ok: true,
    settings: {
      ...root,
      security: {
        ...toRecord(root.security),
        auth: {
          ...toRecord(toRecord(root.security).auth),
          selectedType: QWEN_CODE_SETUP_CONTRACT.qwenAuthType,
        },
      },
      model: {
        ...toRecord(root.model),
        name: selectedModelId,
      },
    },
  };
}

function mergeManagedOpenAiProviders(
  settings: Record<string, unknown>,
  managedEntries: readonly ReturnType<
    typeof createManagedProviderEntries
  >[number][],
):
  | {
      readonly ok: true;
      readonly openaiProviders: readonly unknown[];
    }
  | ConfigMutationBlocked {
  const existingOpenAi = toOpenAiProviders(settings);

  for (const managed of managedEntries) {
    const conflict = existingOpenAi.find((entry) =>
      hasProviderConflict(entry, managed),
    );

    if (conflict !== undefined) {
      return {
        ok: false,
        blocker: createBlocker({
          code: "model_conflict",
          layer: "user-settings",
          message: `Existing modelProviders.openai[] entry for ${managed.id} is not owned by this installer.`,
          nextAction:
            "Rename or remove the conflicting unmanaged provider entry before retrying.",
        }),
      };
    }
  }

  const unmanaged = existingOpenAi.filter(
    (entry) =>
      !isManagedProviderEntry(entry) &&
      !managedEntries.some((managed) => toRecord(entry).id === managed.id),
  );

  return {
    ok: true,
    openaiProviders: [...unmanaged, ...managedEntries],
  };
}

function toOpenAiProviders(settings: Record<string, unknown>): unknown[] {
  const modelProviders = toRecord(settings.modelProviders);
  const openai = modelProviders.openai;

  return Array.isArray(openai) ? openai : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
