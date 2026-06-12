import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";
import type {
  InstallFlowRequest,
  InstallScope,
} from "./contracts/install-flow.js";
import type { InstallDependencies } from "./deps.js";

export type ScopeResolutionResult =
  | {
      readonly ok: true;
      readonly scope: InstallScope;
      readonly prompted: boolean;
    }
  | {
      readonly ok: false;
      readonly blocker: InstallBlocker;
    };

export async function resolveInstallScope(
  request: Pick<InstallFlowRequest, "scope" | "yes">,
  deps: InstallDependencies,
): Promise<ScopeResolutionResult> {
  if (request.scope !== undefined) {
    return { ok: true, scope: request.scope, prompted: false };
  }

  if (request.yes) {
    return { ok: true, scope: "user", prompted: false };
  }

  if (!deps.stdin.isTTY) {
    return {
      ok: false,
      blocker: createBlocker({
        code: "verification_incomplete",
        layer: "scope",
        message:
          "Non-interactive setup requires --scope or --yes before managed writes.",
        nextAction:
          "Pass --scope user, --scope project, or --yes for the user-scope default.",
      }),
    };
  }

  return {
    ok: true,
    scope: await deps.prompts.select("Setup scope", ["user", "project"]),
    prompted: true,
  };
}
