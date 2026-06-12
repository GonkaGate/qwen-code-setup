import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import { getRequiredGonkagateModelIds } from "../constants/models.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";
import type { InstallScope } from "./contracts/install-flow.js";
import type { InstallDependencies } from "./deps.js";
import { readQwenSettings } from "./qwen-settings.js";
import type { ResolvedQwenPaths } from "./paths.js";

export type DurableVerificationResult =
  | {
      readonly ok: true;
    }
  | {
      readonly ok: false;
      readonly blockers: readonly [InstallBlocker, ...InstallBlocker[]];
    };

export async function verifyDurableInstall(input: {
  readonly deps: InstallDependencies;
  readonly paths: ResolvedQwenPaths;
  readonly scope: InstallScope;
  readonly selectedModelId: string;
}): Promise<DurableVerificationResult> {
  const blockers: InstallBlocker[] = [];
  const userSettings = await readQwenSettings(
    input.deps.fs,
    input.paths.userSettingsPath,
  );

  blockers.push(...verifyUserSettings(userSettings, input.selectedModelId));
  blockers.push(
    ...(await verifyPosixPermissions(
      input.deps,
      input.paths.userSettingsPath,
      "user-settings",
    )),
  );

  if (input.scope === "project") {
    const projectSettings = await readQwenSettings(
      input.deps.fs,
      input.paths.projectSettingsPath,
    );
    blockers.push(
      ...verifyProjectActivation(projectSettings, input.selectedModelId),
    );
  }

  if (await input.deps.fs.exists(input.paths.systemSettingsPath)) {
    let systemSettings: Record<string, unknown>;
    try {
      systemSettings = await readQwenSettings(
        input.deps.fs,
        input.paths.systemSettingsPath,
      );
    } catch {
      blockers.push(
        createBlocker({
          code: "verification_incomplete",
          layer: "system-settings",
          path: input.paths.systemSettingsPath,
          message: "System Qwen settings exist but could not be inspected.",
        }),
      );
      systemSettings = {};
    }

    if (hasOwnedEffectiveKeys(systemSettings)) {
      blockers.push(
        createBlocker({
          code: "system_settings_override",
          layer: "system-settings",
          path: input.paths.systemSettingsPath,
          message:
            "System Qwen settings define keys managed by this installer and may override user/project settings.",
          nextAction:
            "Remove conflicting system Qwen settings or verify the override manually before retrying.",
        }),
      );
    }
  }

  if (blockers.length > 0) {
    return { ok: false, blockers: toNonEmpty(blockers) };
  }

  return { ok: true };
}

async function verifyPosixPermissions(
  deps: InstallDependencies,
  path: string,
  layer: string,
): Promise<InstallBlocker[]> {
  if (deps.platform.isWindows || !(await deps.fs.exists(path))) {
    return [];
  }

  const stats = await deps.fs.stat(path);

  if (stats.mode !== undefined && (stats.mode & 0o077) !== 0) {
    return [
      createBlocker({
        code: "verification_incomplete",
        layer,
        path,
        message:
          "Managed Qwen settings permissions are broader than owner-only policy.",
      }),
    ];
  }

  return [];
}

function verifyUserSettings(
  settings: Record<string, unknown>,
  selectedModelId: string,
): InstallBlocker[] {
  const blockers: InstallBlocker[] = [];
  const providerIds = getOpenAiProviderIds(settings);

  for (const requiredId of getRequiredGonkagateModelIds()) {
    if (!providerIds.includes(requiredId)) {
      blockers.push(
        verificationBlocker(
          `User settings are missing managed provider ${requiredId}.`,
        ),
      );
    }
  }

  if (
    getPath(settings, ["env", QWEN_CODE_SETUP_CONTRACT.qwenEnvKey]) ===
    undefined
  ) {
    blockers.push(
      verificationBlocker("User settings are missing the managed env key."),
    );
  }

  if (
    getPath(settings, ["security", "auth", "selectedType"]) !==
    QWEN_CODE_SETUP_CONTRACT.qwenAuthType
  ) {
    blockers.push(
      verificationBlocker("User settings do not select openai auth."),
    );
  }

  if (getPath(settings, ["model", "name"]) !== selectedModelId) {
    blockers.push(
      verificationBlocker("User settings do not select the expected model."),
    );
  }

  return blockers;
}

function verifyProjectActivation(
  settings: Record<string, unknown>,
  selectedModelId: string,
): InstallBlocker[] {
  const blockers: InstallBlocker[] = [];

  if (Object.prototype.hasOwnProperty.call(settings, "modelProviders")) {
    blockers.push(
      createBlocker({
        code: "project_modelproviders_override",
        layer: "project-settings",
        message:
          "Project settings define modelProviders and can hide the user-managed catalog.",
      }),
    );
  }

  if (
    getPath(settings, ["security", "auth", "selectedType"]) !==
    QWEN_CODE_SETUP_CONTRACT.qwenAuthType
  ) {
    blockers.push(
      verificationBlocker("Project settings do not select openai auth."),
    );
  }

  if (getPath(settings, ["model", "name"]) !== selectedModelId) {
    blockers.push(
      verificationBlocker("Project settings do not select the expected model."),
    );
  }

  if (
    getPath(settings, ["env", QWEN_CODE_SETUP_CONTRACT.qwenEnvKey]) !==
    undefined
  ) {
    blockers.push(
      verificationBlocker(
        "Project settings unexpectedly contain the managed secret env key.",
      ),
    );
  }

  return blockers;
}

function hasOwnedEffectiveKeys(settings: Record<string, unknown>): boolean {
  return (
    Object.prototype.hasOwnProperty.call(settings, "modelProviders") ||
    getPath(settings, ["security", "auth", "selectedType"]) !== undefined ||
    getPath(settings, ["model", "name"]) !== undefined ||
    getPath(settings, ["env", QWEN_CODE_SETUP_CONTRACT.qwenEnvKey]) !==
      undefined
  );
}

function getOpenAiProviderIds(settings: Record<string, unknown>): string[] {
  const openai = getPath(settings, ["modelProviders", "openai"]);
  if (!Array.isArray(openai)) {
    return [];
  }
  return openai
    .map((entry) =>
      entry !== null && typeof entry === "object"
        ? (entry as Record<string, unknown>).id
        : undefined,
    )
    .filter((id): id is string => typeof id === "string");
}

function getPath(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

function verificationBlocker(message: string): InstallBlocker {
  return createBlocker({
    code: "verification_incomplete",
    layer: "durable-verification",
    message,
  });
}

function toNonEmpty<T>(values: T[]): readonly [T, ...T[]] {
  return values as [T, ...T[]];
}
