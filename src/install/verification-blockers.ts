import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";

export function createSecretShadowedByProcessEnvBlocker(): InstallBlocker {
  return createBlocker({
    code: "secret_shadowed_by_process_env",
    layer: "process.env",
    message:
      "Current process.env defines GONKAGATE_API_KEY with a different value than the managed durable secret.",
    nextAction:
      "Unset or align the current GONKAGATE_API_KEY before expecting qwen to use the managed settings.env value.",
  });
}

export function createSecretShadowedByProjectEnvBlocker(
  path: string,
): InstallBlocker {
  return createBlocker({
    code: "secret_shadowed_by_project_env",
    layer: "project-env",
    path,
    message:
      "Trusted project env defines GONKAGATE_API_KEY and will shadow the managed user settings.env value.",
    nextAction:
      "Remove or align the project-level GONKAGATE_API_KEY; the installer will not write secrets to repository-local files.",
  });
}

export function createUnreadableProjectEnvBlocker(
  path: string,
): InstallBlocker {
  return createBlocker({
    code: "verification_incomplete",
    layer: "project-env",
    path,
    message: `Could not inspect project env evidence for ${QWEN_CODE_SETUP_CONTRACT.qwenEnvKey}.`,
    nextAction:
      "Make the project env file readable or inspect it manually before claiming current-session verification.",
  });
}
