import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import { getValidatedModels } from "../constants/models.js";
import type { InstallFlowResult } from "../install/contracts/install-flow.js";
import { redactSecrets, redactedJsonStringify } from "../install/redact.js";
import type {
  CliOptions,
  CliParseError,
  RenderedCliOutput,
} from "./contracts.js";

export function renderParseError(error: CliParseError): RenderedCliOutput {
  const message = redactSecrets(error.message);

  if (error.json) {
    return {
      exitCode: 2,
      stdout: `${redactedJsonStringify({
        ok: false,
        status: "failed",
        errorCode: error.code,
        message,
        option: error.option,
      })}\n`,
      stderr: "",
    };
  }

  return {
    exitCode: 2,
    stdout: "",
    stderr: `${message}\n`,
  };
}

export function renderInstallResult(
  result: InstallFlowResult,
  options: CliOptions,
): RenderedCliOutput {
  if (options.json) {
    return {
      exitCode: result.ok ? 0 : 1,
      stdout: `${redactedJsonStringify(toJsonPayload(result))}\n`,
      stderr: "",
    };
  }

  if (!result.ok && result.status === "blocked") {
    const blockerLines = result.blockers.map(
      (blocker) =>
        `Blocked [${blocker.code}]: ${blocker.message}${
          blocker.nextAction ? `\nNext: ${blocker.nextAction}` : ""
        }`,
    );

    return {
      exitCode: 1,
      stdout: "",
      stderr: `${redactSecrets(
        [
          `${QWEN_CODE_SETUP_CONTRACT.packageName} could not complete setup.`,
          ...blockerLines,
          "",
        ].join("\n"),
      )}`,
    };
  }

  if (!result.ok && result.status === "failed") {
    return {
      exitCode: 1,
      stdout: "",
      stderr: `${redactSecrets(
        `Failed [${result.errorCode}]: ${result.message}\n`,
      )}`,
    };
  }

  if (result.ok && result.status === "dry-run") {
    return {
      exitCode: 0,
      stdout: `${redactSecrets(
        [
          "Dry run: no Qwen Code files were changed.",
          ...result.managedPaths.map(
            (path) => `Would manage [${path.kind}]: ${path.path}`,
          ),
          ...result.warnings.map(
            (warning) => `Warning [${warning.code}]: ${warning.message}`,
          ),
          "",
        ].join("\n"),
      )}`,
      stderr: "",
    };
  }

  if (result.ok && result.status === "success") {
    return {
      exitCode: 0,
      stdout: `${redactSecrets(
        [
          "Qwen Code is configured to use GonkaGate.",
          `Selected model: ${result.selectedModel ?? "unknown"}`,
          "Run: qwen",
          "",
        ].join("\n"),
      )}`,
      stderr: "",
    };
  }

  if (result.ok && result.status === "verification-warning") {
    return {
      exitCode: 0,
      stdout: `${redactSecrets(
        [
          "Qwen Code settings were written and locally verified.",
          `Selected model: ${result.selectedModel ?? "unknown"}`,
          ...result.warnings.map(
            (warning) => `Warning [${warning.code}]: ${warning.message}`,
          ),
          "Run: qwen after resolving any current-session warning above.",
          "",
        ].join("\n"),
      )}`,
      stderr: "",
    };
  }

  return result;
}

function toJsonPayload(result: InstallFlowResult): Record<string, unknown> {
  return {
    ok: result.ok,
    status: result.status,
    packageName: QWEN_CODE_SETUP_CONTRACT.packageName,
    runtimeImplemented: result.runtimeImplemented,
    qwenCodeVersionAudited:
      QWEN_CODE_SETUP_CONTRACT.latestAuditedQwenCodeVersion,
    scope: result.scope,
    selectedModel: result.selectedModel,
    managedPaths: result.managedPaths,
    changed: result.changed,
    blockers: result.blockers,
    warnings: result.warnings,
    supportedModels: getValidatedModels().map((model) => model.key),
  };
}
