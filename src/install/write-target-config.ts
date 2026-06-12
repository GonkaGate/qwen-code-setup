import type {
  CuratedModelRegistryRecord,
  CuratedModelKey,
} from "../constants/models.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import type { InstallScope } from "./contracts/install-flow.js";
import type { InstallDependencies } from "./deps.js";
import type { ResolvedQwenPaths } from "./paths.js";
import { readQwenSettings, serializeQwenSettings } from "./qwen-settings.js";
import {
  mutateProjectActivationSettings,
  mutateUserSettings,
} from "./managed-config-mutations.js";
import type { ManagedTextFilePlan } from "./managed-files.js";
import { createInstallState, serializeInstallState } from "./state.js";

export type WriteTargetConfigResult =
  | {
      readonly ok: true;
      readonly plans: readonly ManagedTextFilePlan[];
    }
  | {
      readonly ok: false;
      readonly blockers: readonly [InstallBlocker, ...InstallBlocker[]];
    };

export async function createWriteTargetConfigPlans(input: {
  readonly deps: InstallDependencies;
  readonly paths: ResolvedQwenPaths;
  readonly scope: InstallScope;
  readonly selectedModelKey: CuratedModelKey;
  readonly selectedModelId: string;
  readonly secretValue: string;
  readonly models: readonly CuratedModelRegistryRecord[];
}): Promise<WriteTargetConfigResult> {
  const userSettings = await readQwenSettings(
    input.deps.fs,
    input.paths.userSettingsPath,
  );
  const userMutation = mutateUserSettings(userSettings, {
    selectedModelId: input.selectedModelId,
    secretValue: input.secretValue,
    models: input.models,
  });

  if (!userMutation.ok) {
    return { ok: false, blockers: [userMutation.blocker] };
  }

  const mode = input.deps.platform.isWindows ? undefined : 0o600;
  const plans: ManagedTextFilePlan[] = [
    {
      kind: "user-settings",
      path: input.paths.userSettingsPath,
      contents: serializeQwenSettings(userMutation.settings),
      backupDir: input.paths.userBackupDir,
      mode,
      requireUserProfile: input.deps.platform.isWindows,
    },
  ];

  if (input.scope === "project") {
    const projectSettings = await readQwenSettings(
      input.deps.fs,
      input.paths.projectSettingsPath,
    );
    const projectMutation = mutateProjectActivationSettings(
      projectSettings,
      input.selectedModelId,
    );

    if (!projectMutation.ok) {
      return { ok: false, blockers: [projectMutation.blocker] };
    }

    plans.push({
      kind: "project-settings",
      path: input.paths.projectSettingsPath,
      contents: serializeQwenSettings(projectMutation.settings),
      backupDir: input.paths.projectBackupDir,
      mode,
    });
  }

  plans.push({
    kind: "install-state",
    path: input.paths.installStatePath,
    contents: serializeInstallState(
      createInstallState({
        scope: input.scope,
        selectedModelKey: input.selectedModelKey,
        userSettingsPath: input.paths.userSettingsPath,
        ...(input.scope === "project"
          ? { projectSettingsPath: input.paths.projectSettingsPath }
          : {}),
        verifiedAt: input.deps.clock.isoNow(),
      }),
    ),
    mode,
  });

  return { ok: true, plans };
}
