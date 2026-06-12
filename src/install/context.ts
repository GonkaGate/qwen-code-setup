import type { InstallBlocker } from "./contracts/blockers.js";
import type { InstallDependencies } from "./deps.js";
import { resolveQwenPaths, type ResolvedQwenPaths } from "./paths.js";
import {
  getQwenCompatibilityEvidence,
  type QwenCompatibilityEvidence,
} from "./qwen-compatibility.js";
import { detectQwen, type QwenRuntimeEvidence } from "./qwen.js";

export interface InstallContext {
  readonly qwen: QwenRuntimeEvidence;
  readonly paths: ResolvedQwenPaths;
  readonly compatibility: QwenCompatibilityEvidence;
}

export type InstallContextResult =
  | {
      readonly ok: true;
      readonly context: InstallContext;
    }
  | {
      readonly ok: false;
      readonly blockers: readonly [InstallBlocker, ...InstallBlocker[]];
    };

export async function resolveInstallContext(
  deps: InstallDependencies,
): Promise<InstallContextResult> {
  const qwen = await detectQwen(deps);

  if (!qwen.ok) {
    return {
      ok: false,
      blockers: [qwen.blocker],
    };
  }

  return {
    ok: true,
    context: {
      qwen: qwen.evidence,
      paths: await resolveQwenPaths(deps),
      compatibility: getQwenCompatibilityEvidence(),
    },
  };
}
