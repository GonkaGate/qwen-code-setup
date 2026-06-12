import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";
import type { InstallFlowRequest } from "./contracts/install-flow.js";
import type { InstallDependencies } from "./deps.js";
import { getEnvValue } from "./deps.js";

export type SecretSource = "api-key-stdin" | "env" | "hidden-prompt";

export interface ResolvedSecret {
  readonly value: string;
  readonly source: SecretSource;
}

export type SecretResolutionResult =
  | {
      readonly ok: true;
      readonly secret: ResolvedSecret;
    }
  | {
      readonly ok: false;
      readonly blocker: InstallBlocker;
    };

export async function resolveGonkagateApiKey(
  request: Pick<InstallFlowRequest, "apiKeyStdin">,
  deps: InstallDependencies,
): Promise<SecretResolutionResult> {
  if (request.apiKeyStdin) {
    return normalizeSecret(await deps.stdin.readAll(), "api-key-stdin");
  }

  const envSecret = getEnvValue(
    deps.env.toObject(),
    QWEN_CODE_SETUP_CONTRACT.qwenEnvKey,
    deps.platform.platform,
  );

  if (envSecret !== undefined) {
    return normalizeSecret(envSecret, "env");
  }

  if (!deps.stdin.isTTY) {
    return {
      ok: false,
      blocker: secretMissingBlocker(
        "No safe secret source was available in non-interactive mode.",
      ),
    };
  }

  return normalizeSecret(
    await deps.prompts.secret("GonkaGate API key"),
    "hidden-prompt",
  );
}

export function normalizeSecret(
  rawValue: string,
  source: SecretSource,
): SecretResolutionResult {
  const tokens = rawValue
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);

  if (tokens.length !== 1) {
    return {
      ok: false,
      blocker: secretMissingBlocker(
        "Expected exactly one GonkaGate API key from a safe secret source.",
      ),
    };
  }

  return {
    ok: true,
    secret: {
      value: tokens[0],
      source,
    },
  };
}

function secretMissingBlocker(message: string): InstallBlocker {
  return createBlocker({
    code: "secret_missing",
    layer: "secret-intake",
    message,
    nextAction:
      "Provide GONKAGATE_API_KEY, pipe the key through --api-key-stdin, or run interactively for a hidden prompt.",
  });
}
