import type { InstallBlockerCode } from "./contracts/blockers.js";

export type InstallerErrorCode =
  | InstallBlockerCode
  | "parse_error"
  | "unexpected_error";

export class InstallerError extends Error {
  readonly code: InstallerErrorCode;

  constructor(
    code: InstallerErrorCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "InstallerError";
    this.code = code;
  }
}

export function toInstallerError(error: unknown): InstallerError {
  if (error instanceof InstallerError) {
    return error;
  }

  const message =
    error instanceof Error ? error.message : "Unexpected installer failure.";

  return new InstallerError("unexpected_error", message, { cause: error });
}
