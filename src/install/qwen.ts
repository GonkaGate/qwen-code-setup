import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";
import type { InstallDependencies } from "./deps.js";
import { redactSecrets, redactUnknown } from "./redact.js";

export interface QwenAuditedConfigSemantics {
  readonly userSettingsPath: string;
  readonly homeSettingsPath: string;
  readonly workspaceSettingsPath: string;
  readonly systemSettingsPaths: readonly string[];
  readonly modelProvidersMergeStrategy: "replace";
  readonly authCommandRemoved: true;
  readonly statusSurface: "/doctor";
  readonly envPrecedence: readonly string[];
}

export interface QwenRuntimeEvidence {
  readonly packageName: string;
  readonly binaryName: string;
  readonly version: string;
  readonly supportedVersion: string;
  readonly packageNodeEngine: string;
  readonly configSemantics: QwenAuditedConfigSemantics;
}

export type QwenDetectionResult =
  | {
      readonly ok: true;
      readonly evidence: QwenRuntimeEvidence;
    }
  | {
      readonly ok: false;
      readonly blocker: InstallBlocker;
    };

const QWEN_VERSION_COMMAND_TIMEOUT_MS = 5_000;

export async function detectQwen(
  deps: InstallDependencies,
  command = QWEN_CODE_SETUP_CONTRACT.qwenBinaryName,
): Promise<QwenDetectionResult> {
  try {
    const result = await deps.commands.run(command, ["--version"], {
      cwd: deps.platform.cwd,
      env: deps.env.toObject(),
      timeoutMs: QWEN_VERSION_COMMAND_TIMEOUT_MS,
      windowsHide: deps.platform.isWindows,
    });

    if (result.exitCode !== 0) {
      return {
        ok: false,
        blocker: qwenNotFoundBlocker(
          `Command exited with ${String(result.exitCode)} while reading qwen version.`,
        ),
      };
    }

    const version = parseQwenVersion(`${result.stdout}\n${result.stderr}`);

    if (version === undefined) {
      return {
        ok: false,
        blocker: unsupportedVersionBlocker(
          "Unable to parse qwen version from --version output.",
        ),
      };
    }

    if (version !== QWEN_CODE_SETUP_CONTRACT.latestAuditedQwenCodeVersion) {
      return {
        ok: false,
        blocker: unsupportedVersionBlocker(
          `Found qwen ${version}; audited support is ${QWEN_CODE_SETUP_CONTRACT.latestAuditedQwenCodeVersion}.`,
        ),
      };
    }

    return {
      ok: true,
      evidence: {
        packageName: QWEN_CODE_SETUP_CONTRACT.qwenPackageName,
        binaryName: QWEN_CODE_SETUP_CONTRACT.qwenBinaryName,
        version,
        supportedVersion: QWEN_CODE_SETUP_CONTRACT.latestAuditedQwenCodeVersion,
        packageNodeEngine: QWEN_CODE_SETUP_CONTRACT.qwenPackageNodeEngine,
        configSemantics: getAuditedQwenConfigSemantics(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      blocker: qwenNotFoundBlocker(redactUnknown(error)),
    };
  }
}

export function parseQwenVersion(output: string): string | undefined {
  const match = output.match(
    /(?:^|[^0-9A-Za-z])v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\b/,
  );
  return match?.[1];
}

export function getAuditedQwenConfigSemantics(): QwenAuditedConfigSemantics {
  return {
    userSettingsPath: QWEN_CODE_SETUP_CONTRACT.qwenUserSettingsPath,
    homeSettingsPath: QWEN_CODE_SETUP_CONTRACT.qwenHomeSettingsPath,
    workspaceSettingsPath: QWEN_CODE_SETUP_CONTRACT.qwenWorkspaceSettingsPath,
    systemSettingsPaths: QWEN_CODE_SETUP_CONTRACT.qwenSystemSettingsPaths,
    modelProvidersMergeStrategy:
      QWEN_CODE_SETUP_CONTRACT.qwenModelProvidersMergeStrategy,
    authCommandRemoved: QWEN_CODE_SETUP_CONTRACT.qwenAuthCommandRemoved,
    statusSurface: QWEN_CODE_SETUP_CONTRACT.qwenStatusSurface,
    envPrecedence: QWEN_CODE_SETUP_CONTRACT.qwenEnvPrecedence,
  };
}

function qwenNotFoundBlocker(detail: string): InstallBlocker {
  return createBlocker({
    code: "qwen_not_found",
    layer: "qwen-detection",
    message: `Could not execute qwen --version. ${redactSecrets(detail)}`,
    nextAction:
      "Install @qwen-code/qwen-code and ensure the qwen binary is on PATH.",
  });
}

function unsupportedVersionBlocker(detail: string): InstallBlocker {
  return createBlocker({
    code: "qwen_version_unsupported",
    layer: "qwen-detection",
    message: redactSecrets(detail),
    nextAction:
      "Use the audited @qwen-code/qwen-code version or rerun the compatibility audit before enabling setup.",
  });
}
