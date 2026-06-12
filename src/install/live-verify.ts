import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";
import type { InstallDependencies } from "./deps.js";
import { redactSecrets } from "./redact.js";

export type LiveVerificationResult =
  | {
      readonly ok: true;
      readonly skipped: boolean;
    }
  | {
      readonly ok: false;
      readonly blocker: InstallBlocker;
    };

export async function verifyLiveIfRequested(input: {
  readonly deps: InstallDependencies;
  readonly verifyLive: boolean;
  readonly selectedModelId: string;
}): Promise<LiveVerificationResult> {
  if (!input.verifyLive) {
    return { ok: true, skipped: true };
  }

  const result = await input.deps.commands.run(
    "qwen",
    ["--model", input.selectedModelId, "--prompt", "ping"],
    {
      cwd: input.deps.platform.cwd,
      timeoutMs: 15_000,
      windowsHide: input.deps.platform.isWindows,
    },
  );

  if (result.exitCode !== 0) {
    return {
      ok: false,
      blocker: createBlocker({
        code: "live_verify_failed",
        layer: "live-verification",
        message: redactSecrets(
          `Live Qwen verification failed with exit ${String(
            result.exitCode,
          )}: ${result.stderr}`,
        ),
        nextAction:
          "Inspect Qwen/GonkaGate connectivity manually; managed files were already locally verified.",
      }),
    };
  }

  return { ok: true, skipped: false };
}
