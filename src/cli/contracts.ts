import type {
  InstallFlowRequest,
  InstallScope,
} from "../install/contracts/install-flow.js";

export type CliScope = InstallScope;

export interface CliWritable {
  write(chunk: string): unknown;
}

export interface CliIo {
  readonly stdout: CliWritable;
  readonly stderr: CliWritable;
}

export interface CliResult {
  readonly exitCode: number;
}

export interface CliOptions extends InstallFlowRequest {}

export type CliParseErrorCode =
  | "forbidden_option"
  | "invalid_scope"
  | "invalid_model"
  | "parse_error";

export interface CliParseError {
  readonly code: CliParseErrorCode;
  readonly message: string;
  readonly json: boolean;
  readonly option?: string;
}

export type CliParseResult =
  | {
      readonly kind: "parsed";
      readonly options: CliOptions;
    }
  | {
      readonly kind: "early-exit";
      readonly exitCode: number;
      readonly stdout: string;
      readonly stderr: string;
    }
  | {
      readonly kind: "parse-error";
      readonly error: CliParseError;
    };

export interface RenderedCliOutput {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
}
