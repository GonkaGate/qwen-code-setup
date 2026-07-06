import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import type {
  InstallBlockedResult,
  InstallFailedResult,
  InstallFlowRequest,
  InstallFlowResult,
} from "./contracts/install-flow.js";
import type { InstallDependencies } from "./deps.js";
import { fetchGonkagateModels } from "./gonkagate-client.js";
import { createSecretStoragePlan } from "./secret-storage.js";
import { resolveGonkagateApiKey } from "./secrets.js";
import { selectSetupModel } from "./selection.js";
import { resolveInstallContext } from "./context.js";

export async function runPrewriteInstallFlow(
  request: InstallFlowRequest,
  deps: InstallDependencies,
): Promise<InstallFlowResult> {
  const context = await resolveInstallContext(deps);

  if (!context.ok) {
    return blockedResult(request, context.blockers);
  }

  const secret = await resolveGonkagateApiKey(request, deps);

  if (!secret.ok) {
    return blockedResult(request, [secret.blocker]);
  }

  const remoteModels = await fetchGonkagateModels(deps, secret.secret.value);

  if (!remoteModels.ok) {
    return {
      ok: false,
      status: "failed",
      runtimeImplemented: QWEN_CODE_SETUP_CONTRACT.runtimeImplemented,
      scope: request.scope,
      selectedModel: request.modelKey,
      managedPaths: [],
      changed: false,
      blockers: [],
      warnings: [],
      errorCode: remoteModels.error.code,
      message: remoteModels.error.message,
    } satisfies InstallFailedResult;
  }

  const selection = await selectSetupModel(request, deps, remoteModels.models);

  if (!selection.ok) {
    return blockedResult(request, [selection.blocker]);
  }

  const storagePlan = createSecretStoragePlan(
    context.context.paths,
    deps.platform,
    request.scope ?? "user",
  );

  return {
    ok: false,
    status: "blocked",
    runtimeImplemented: QWEN_CODE_SETUP_CONTRACT.runtimeImplemented,
    scope: request.scope,
    selectedModel: selection.selectedModelId,
    managedPaths: [
      {
        kind: "user-settings",
        path: storagePlan.target.path,
        changed: false,
      },
    ],
    changed: false,
    blockers: [
      {
        code: "runtime_not_implemented",
        layer: "runtime",
        message:
          "Qwen, secret intake, model discovery, and selection passed, but managed writes and verification remain disabled.",
        nextAction:
          "Continue with Goal Pack 3 before claiming setup can write Qwen Code settings.",
      },
    ],
    warnings: [],
  };
}

function blockedResult(
  request: InstallFlowRequest,
  blockers: readonly [InstallBlocker, ...InstallBlocker[]],
): InstallBlockedResult {
  return {
    ok: false,
    status: "blocked",
    runtimeImplemented: QWEN_CODE_SETUP_CONTRACT.runtimeImplemented,
    scope: request.scope,
    selectedModel: request.modelKey,
    managedPaths: [],
    changed: false,
    blockers,
    warnings: [],
  };
}
