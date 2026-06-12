import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import {
  getRequiredGonkagateModelIds,
  type CuratedModelKey,
} from "../constants/models.js";
import type { InstallScope } from "./contracts/install-flow.js";
import { stringifyJsonObject } from "./jsonc.js";

export const SECRET_POLICY_VERSION = 1;

export interface InstallState {
  readonly installerVersion: string;
  readonly auditedQwenVersion: string;
  readonly scope: InstallScope;
  readonly selectedModelKey: CuratedModelKey;
  readonly managedModelIds: readonly string[];
  readonly userSettingsPath: string;
  readonly projectSettingsPath?: string;
  readonly lastDurableVerificationAt: string;
  readonly secretStoragePolicyVersion: number;
}

export function createInstallState(input: {
  readonly scope: InstallScope;
  readonly selectedModelKey: CuratedModelKey;
  readonly userSettingsPath: string;
  readonly projectSettingsPath?: string;
  readonly verifiedAt: string;
}): InstallState {
  return {
    installerVersion: QWEN_CODE_SETUP_CONTRACT.packageVersion,
    auditedQwenVersion: QWEN_CODE_SETUP_CONTRACT.latestAuditedQwenCodeVersion,
    scope: input.scope,
    selectedModelKey: input.selectedModelKey,
    managedModelIds: getRequiredGonkagateModelIds(),
    userSettingsPath: input.userSettingsPath,
    ...(input.projectSettingsPath === undefined
      ? {}
      : { projectSettingsPath: input.projectSettingsPath }),
    lastDurableVerificationAt: input.verifiedAt,
    secretStoragePolicyVersion: SECRET_POLICY_VERSION,
  };
}

export function serializeInstallState(state: InstallState): string {
  return stringifyJsonObject(state as unknown as Record<string, unknown>);
}
