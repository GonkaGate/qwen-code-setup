import { Command, CommanderError } from "commander";
import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import {
  UnsupportedCuratedModelError,
  getCuratedModelByKey,
  getRecommendedDefaultModel,
} from "../constants/models.js";
import type { CliOptions, CliParseError, CliParseResult } from "./contracts.js";

const FORBIDDEN_OPTIONS = ["--api-key", "--base-url", "--model-id"] as const;

interface RawCliOptions {
  readonly json?: boolean;
  readonly yes?: boolean;
  readonly apiKeyStdin?: boolean;
  readonly scope?: string;
  readonly model?: string;
  readonly dryRun?: boolean;
  readonly verifyLive?: boolean;
}

export function createCli(): Command {
  const command = new Command();

  command
    .name(QWEN_CODE_SETUP_CONTRACT.binaryName)
    .description(
      "Configure Qwen Code to use GonkaGate as an OpenAI-compatible provider.",
    )
    .version(QWEN_CODE_SETUP_CONTRACT.packageVersion, "-v, --version")
    .option("--scope <scope>", "Planned setup scope: user or project.")
    .option("--model <model>", "Planned curated GonkaGate model key.")
    .option("--yes", "Accept safe defaults once the runtime is implemented.")
    .option("--json", "Render machine-readable installer output.")
    .option("--api-key-stdin", "Read the GonkaGate API key from stdin.")
    .option("--dry-run", "Show planned installer work without writing files.")
    .option(
      "--verify-live",
      "Run optional live verification after local proof.",
    )
    .allowExcessArguments(false);

  return command;
}

export function parseCliArguments(
  argv: readonly string[] = process.argv,
): CliParseResult {
  const userArgs = argv.slice(2);
  const wantsJson = userArgs.includes("--json");
  const forbidden = findForbiddenOption(userArgs);

  if (forbidden !== undefined) {
    return {
      kind: "parse-error",
      error: {
        code: "forbidden_option",
        option: forbidden,
        json: wantsJson,
        message: `${forbidden} is forbidden; use a hidden prompt, GONKAGATE_API_KEY, or --api-key-stdin for secrets.`,
      },
    };
  }

  const command = createCli();
  let stdout = "";
  let stderr = "";

  command.exitOverride();
  command.configureOutput({
    writeOut: (chunk) => {
      stdout += chunk;
    },
    writeErr: (chunk) => {
      stderr += chunk;
    },
  });

  try {
    command.parse(argv, { from: "node" });
  } catch (error) {
    if (isCommanderHelpOrVersionExit(error)) {
      return {
        kind: "early-exit",
        exitCode: 0,
        stdout,
        stderr,
      };
    }

    return {
      kind: "parse-error",
      error: commanderParseError(error, wantsJson),
    };
  }

  return normalizeCliOptions(command.opts<RawCliOptions>(), wantsJson);
}

function normalizeCliOptions(
  rawOptions: RawCliOptions,
  wantsJson: boolean,
): CliParseResult {
  if (
    rawOptions.scope !== undefined &&
    rawOptions.scope !== "user" &&
    rawOptions.scope !== "project"
  ) {
    return {
      kind: "parse-error",
      error: {
        code: "invalid_scope",
        option: "--scope",
        json: wantsJson,
        message: `Unsupported scope "${rawOptions.scope}". Expected "user" or "project".`,
      },
    };
  }

  try {
    const explicitModel =
      rawOptions.model === undefined
        ? undefined
        : getCuratedModelByKey(rawOptions.model).key;
    const defaultModel =
      rawOptions.yes === true && explicitModel === undefined
        ? getRecommendedDefaultModel().key
        : undefined;

    const options: CliOptions = {
      scope: rawOptions.scope,
      modelKey: explicitModel ?? defaultModel,
      yes: rawOptions.yes === true,
      json: rawOptions.json === true,
      apiKeyStdin: rawOptions.apiKeyStdin === true,
      dryRun: rawOptions.dryRun === true,
      verifyLive: rawOptions.verifyLive === true,
    };

    return { kind: "parsed", options };
  } catch (error) {
    if (error instanceof UnsupportedCuratedModelError) {
      return {
        kind: "parse-error",
        error: {
          code: "invalid_model",
          option: "--model",
          json: wantsJson,
          message: `Unsupported curated model key "${error.modelKey}".`,
        },
      };
    }

    throw error;
  }
}

function findForbiddenOption(args: readonly string[]): string | undefined {
  return args.find((arg) =>
    FORBIDDEN_OPTIONS.some(
      (option) => arg === option || arg.startsWith(`${option}=`),
    ),
  );
}

function commanderParseError(
  error: unknown,
  wantsJson: boolean,
): CliParseError {
  if (error instanceof CommanderError) {
    return {
      code: "parse_error",
      json: wantsJson,
      message: error.message,
    };
  }

  return {
    code: "parse_error",
    json: wantsJson,
    message: error instanceof Error ? error.message : "Failed to parse CLI.",
  };
}

function isCommanderHelpOrVersionExit(error: unknown): boolean {
  return (
    error instanceof CommanderError &&
    (error.code === "commander.helpDisplayed" ||
      error.code === "commander.version")
  );
}
