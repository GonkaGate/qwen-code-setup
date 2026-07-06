import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import type {
  InstallBlockedResult,
  InstallDryRunResult,
  InstallFailedResult,
  InstallFlowRequest,
  InstallFlowResult,
  InstallScope,
  InstallSuccessResult,
  InstallVerificationWarningResult,
  ManagedPathSummary,
} from "./contracts/install-flow.js";
import type { InstallDependencies } from "./deps.js";
import { createDryRunPlanSummary } from "./dry-run.js";
import { fetchGonkagateModels } from "./gonkagate-client.js";
import { verifyLiveIfRequested } from "./live-verify.js";
import {
  applyManagedWriteTransaction,
  rollbackManagedWrites,
} from "./managed-write-transaction.js";
import { readQwenSettings } from "./qwen-settings.js";
import { resolveInstallContext } from "./context.js";
import { readManagedSecretFromSettings } from "./secret-storage.js";
import { resolveGonkagateApiKey, type ResolvedSecret } from "./secrets.js";
import { selectSetupModel } from "./selection.js";
import { resolveInstallScope } from "./scope.js";
import { verifyCurrentSession } from "./verify-current-session.js";
import { verifyDurableInstall } from "./verify-effective.js";
import { createWriteTargetConfigPlans } from "./write-target-config.js";

export async function runInstallFlow(
  request: InstallFlowRequest,
  deps: InstallDependencies,
): Promise<InstallFlowResult> {
  const context = await resolveInstallContext(deps);

  if (!context.ok) {
    return blockedResult(request, undefined, context.blockers);
  }

  const scope = await resolveInstallScope(request, deps);

  if (!scope.ok) {
    return blockedResult(request, undefined, [scope.blocker]);
  }

  const secret = await resolveSecretOrReusableManagedKey(
    request,
    deps,
    context.context.paths.userSettingsPath,
  );

  if (!secret.ok) {
    return blockedResult(request, scope.scope, [secret.blocker]);
  }

  const remoteModels = await fetchGonkagateModels(deps, secret.secret.value);

  if (!remoteModels.ok) {
    return failedResult(
      request,
      scope.scope,
      remoteModels.error.code,
      remoteModels.error.message,
    );
  }

  const selection = await selectSetupModel(request, deps, remoteModels.models);

  if (!selection.ok) {
    return blockedResult(request, scope.scope, [selection.blocker]);
  }

  const writePlans = await createWriteTargetConfigPlans({
    deps,
    paths: context.context.paths,
    scope: scope.scope,
    selectedModelId: selection.selectedModelId,
    secretValue: secret.secret.value,
    models: remoteModels.models.models,
  });

  if (!writePlans.ok) {
    return blockedResult(request, scope.scope, writePlans.blockers);
  }

  if (request.dryRun) {
    const summary = createDryRunPlanSummary(scope.scope, writePlans.plans);
    const warnings = await verifyCurrentSession({
      deps,
      paths: context.context.paths,
      managedSecret: secret.secret.value,
      trustedProject: scope.scope === "project",
    });
    return {
      ok: true,
      status: "dry-run",
      runtimeImplemented: QWEN_CODE_SETUP_CONTRACT.runtimeImplemented,
      scope: scope.scope,
      selectedModel: selection.selectedModelId,
      managedPaths: summary.managedPaths,
      changed: false,
      blockers: [],
      warnings,
    } satisfies InstallDryRunResult;
  }

  const writes = await applyManagedWriteTransaction(deps, writePlans.plans);

  if (!writes.ok) {
    return blockedResult(request, scope.scope, [
      writes.rollbackBlocker ?? writes.blocker,
    ]);
  }

  const durableVerification = await verifyDurableInstall({
    deps,
    paths: context.context.paths,
    scope: scope.scope,
    selectedModelId: selection.selectedModelId,
    managedModelIds: remoteModels.models.modelIds,
  });

  if (!durableVerification.ok) {
    const rollback = await rollbackManagedWrites(deps, writes.results);
    return blockedResult(request, scope.scope, [
      rollback.blocker ?? durableVerification.blockers[0],
    ]);
  }

  const warnings = await verifyCurrentSession({
    deps,
    paths: context.context.paths,
    managedSecret: secret.secret.value,
    trustedProject: scope.scope === "project",
  });

  const live = await verifyLiveIfRequested({
    deps,
    verifyLive: request.verifyLive,
    selectedModelId: selection.selectedModelId,
  });

  if (!live.ok) {
    return blockedResult(request, scope.scope, [live.blocker]);
  }

  const base = {
    runtimeImplemented: QWEN_CODE_SETUP_CONTRACT.runtimeImplemented,
    scope: scope.scope,
    selectedModel: selection.selectedModelId,
    managedPaths: writes.results.map((result) => ({
      kind: result.kind,
      path: result.path,
      changed: result.changed,
    })) satisfies ManagedPathSummary[],
    changed: writes.changed,
    blockers: [],
    warnings,
  };

  if (warnings.length > 0) {
    return {
      ...base,
      ok: true,
      status: "verification-warning",
      warnings: warnings as [(typeof warnings)[number], ...typeof warnings],
    } satisfies InstallVerificationWarningResult;
  }

  return {
    ...base,
    ok: true,
    status: "success",
    blockers: [],
  } satisfies InstallSuccessResult;
}

async function resolveSecretOrReusableManagedKey(
  request: InstallFlowRequest,
  deps: InstallDependencies,
  userSettingsPath: string,
): Promise<
  | {
      readonly ok: true;
      readonly secret: ResolvedSecret;
    }
  | {
      readonly ok: false;
      readonly blocker: InstallBlocker;
    }
> {
  const secret = await resolveGonkagateApiKey(request, deps);

  if (secret.ok || !request.yes) {
    return secret;
  }

  const reusable = readManagedSecretFromSettings(
    await readQwenSettings(deps.fs, userSettingsPath),
  );

  if (reusable !== undefined) {
    return {
      ok: true,
      secret: {
        value: reusable,
        source: "env",
      },
    };
  }

  return secret;
}

function blockedResult(
  request: InstallFlowRequest,
  scope: InstallScope | undefined,
  blockers: readonly [InstallBlocker, ...InstallBlocker[]],
): InstallBlockedResult {
  return {
    ok: false,
    status: "blocked",
    runtimeImplemented: QWEN_CODE_SETUP_CONTRACT.runtimeImplemented,
    scope,
    selectedModel: request.modelKey,
    managedPaths: [],
    changed: false,
    blockers,
    warnings: [],
  };
}

function failedResult(
  request: InstallFlowRequest,
  scope: InstallScope,
  errorCode: string,
  message: string,
): InstallFailedResult {
  return {
    ok: false,
    status: "failed",
    runtimeImplemented: QWEN_CODE_SETUP_CONTRACT.runtimeImplemented,
    scope,
    selectedModel: request.modelKey,
    managedPaths: [],
    changed: false,
    blockers: [],
    warnings: [],
    errorCode,
    message,
  };
}
