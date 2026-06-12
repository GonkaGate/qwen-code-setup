import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import { getRequiredGonkagateModelIds } from "../constants/models.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";

export interface QwenCompatibilityEvidence {
  readonly auditedVersion: string;
  readonly verdict: "CONCERNS";
  readonly evidenceSource: string;
  readonly modelProvidersMergeStrategy: "replace";
  readonly projectModelProvidersCanHideUserCatalog: true;
  readonly projectScopeWritesGated: true;
  readonly trustedWorkspaceRequiredForProjectSettings: true;
  readonly authCommandRemoved: true;
  readonly statusSurface: "/doctor";
}

export interface CompatibilityLayerInput {
  readonly userSettings?: unknown;
  readonly projectSettings?: unknown;
  readonly trustedProject: boolean;
}

export interface CompatibilityLayerResult {
  readonly evidence: QwenCompatibilityEvidence;
  readonly blocker?: InstallBlocker;
}

export function getQwenCompatibilityEvidence(): QwenCompatibilityEvidence {
  return {
    auditedVersion: QWEN_CODE_SETUP_CONTRACT.latestAuditedQwenCodeVersion,
    verdict: QWEN_CODE_SETUP_CONTRACT.latestAuditedQwenCodeVerdict,
    evidenceSource: "docs/qwen-compatibility-audit.md",
    modelProvidersMergeStrategy:
      QWEN_CODE_SETUP_CONTRACT.qwenModelProvidersMergeStrategy,
    projectModelProvidersCanHideUserCatalog: true,
    projectScopeWritesGated: true,
    trustedWorkspaceRequiredForProjectSettings: true,
    authCommandRemoved: QWEN_CODE_SETUP_CONTRACT.qwenAuthCommandRemoved,
    statusSurface: QWEN_CODE_SETUP_CONTRACT.qwenStatusSurface,
  };
}

export function evaluateQwenCompatibilityLayers(
  input: CompatibilityLayerInput,
): CompatibilityLayerResult {
  const evidence = getQwenCompatibilityEvidence();

  if (
    input.trustedProject &&
    hasOwnObjectProperty(input.projectSettings, "modelProviders")
  ) {
    return {
      evidence,
      blocker: createProjectModelProvidersOverrideBlocker(),
    };
  }

  return { evidence };
}

export function mergeSettingsForCompatibilityProof(
  userSettings: unknown,
  projectSettings: unknown,
  trustedProject: boolean,
): Record<string, unknown> {
  const user = toRecord(userSettings);
  const project = trustedProject ? toRecord(projectSettings) : {};
  const merged = { ...user, ...project };

  if (hasOwnObjectProperty(project, "modelProviders")) {
    merged.modelProviders = project.modelProviders;
  } else if (hasOwnObjectProperty(user, "modelProviders")) {
    merged.modelProviders = user.modelProviders;
  }

  return merged;
}

export function projectModelProvidersCanHideManagedCatalog(
  userSettings: unknown,
  projectSettings: unknown,
  trustedProject: boolean,
): boolean {
  if (
    !trustedProject ||
    !hasOwnObjectProperty(projectSettings, "modelProviders")
  ) {
    return false;
  }

  const effective = mergeSettingsForCompatibilityProof(
    userSettings,
    projectSettings,
    trustedProject,
  );
  const effectiveIds = getOpenAiProviderIds(effective);

  return getRequiredGonkagateModelIds().some(
    (id) => !effectiveIds.includes(id),
  );
}

export function createProjectModelProvidersOverrideBlocker(): InstallBlocker {
  return createBlocker({
    code: "project_modelproviders_override",
    layer: "qwen-compatibility",
    path: QWEN_CODE_SETUP_CONTRACT.qwenWorkspaceSettingsPath,
    message:
      "Trusted project settings define modelProviders; Qwen Code 0.18.0 replaces this key across scopes, so project scope could hide the user-managed GonkaGate provider catalog.",
    nextAction:
      "Remove project-level modelProviders or use user scope until project activation-only writes are verified.",
  });
}

function getOpenAiProviderIds(settings: unknown): string[] {
  const root = toRecord(settings);
  const providers = toRecord(root.modelProviders);
  const openai = providers.openai;

  if (!Array.isArray(openai)) {
    return [];
  }

  return openai
    .map((entry) => toRecord(entry).id)
    .filter((id): id is string => typeof id === "string");
}

function hasOwnObjectProperty(
  value: unknown,
  property: string,
): value is Record<string, unknown> {
  return Object.prototype.hasOwnProperty.call(toRecord(value), property);
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
