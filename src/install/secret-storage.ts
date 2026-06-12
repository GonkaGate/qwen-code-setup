import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import type { InstallScope } from "./contracts/install-flow.js";
import type { PlatformFacts } from "./deps.js";
import type { ResolvedQwenPaths } from "./paths.js";

export interface SecretStoragePlan {
  readonly target: {
    readonly kind: "user-settings-env";
    readonly path: string;
    readonly settingsPath: "env.GONKAGATE_API_KEY";
  };
  readonly scope: InstallScope;
  readonly writesProjectFiles: false;
  readonly mutatesShellProfiles: false;
  readonly posixPolicy?: {
    readonly directoryMode: 0o700;
    readonly fileMode: 0o600;
  };
  readonly windowsPolicy?: {
    readonly userProfileScoped: true;
    readonly description: string;
  };
}

export function createSecretStoragePlan(
  paths: Pick<ResolvedQwenPaths, "userSettingsPath">,
  facts: PlatformFacts,
  scope: InstallScope,
): SecretStoragePlan {
  return {
    target: {
      kind: "user-settings-env",
      path: paths.userSettingsPath,
      settingsPath: "env.GONKAGATE_API_KEY",
    },
    scope,
    writesProjectFiles: false,
    mutatesShellProfiles: false,
    ...(facts.isWindows
      ? {
          windowsPolicy: {
            userProfileScoped: true,
            description:
              "Keep managed user files inside the current user profile or active Qwen user directory and rely on per-user ACLs.",
          },
        }
      : {
          posixPolicy: {
            directoryMode: 0o700,
            fileMode: 0o600,
          },
        }),
  };
}

export function applySecretEnvMutation(
  settings: unknown,
  secretValue: string,
): Record<string, unknown> {
  const root = toRecord(settings);
  const env = toRecord(root.env);

  return {
    ...root,
    env: {
      ...env,
      [QWEN_CODE_SETUP_CONTRACT.qwenEnvKey]: secretValue,
    },
  };
}

export function readManagedSecretFromSettings(
  settings: unknown,
): string | undefined {
  const root = toRecord(settings);
  const env = toRecord(root.env);
  const value = env[QWEN_CODE_SETUP_CONTRACT.qwenEnvKey];

  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

export function summarizeSecretStoragePlan(
  plan: SecretStoragePlan,
): Record<string, unknown> {
  return {
    target: plan.target,
    scope: plan.scope,
    writesProjectFiles: plan.writesProjectFiles,
    mutatesShellProfiles: plan.mutatesShellProfiles,
    secretPreview: "[REDACTED]",
    posixPolicy: plan.posixPolicy,
    windowsPolicy: plan.windowsPolicy,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
