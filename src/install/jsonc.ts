import { parse, type ParseError, printParseErrorCode } from "jsonc-parser";
import { InstallerError } from "./errors.js";

export function parseJsoncObject(
  contents: string,
  path: string,
): Record<string, unknown> {
  const errors: ParseError[] = [];
  const value = parse(contents, errors, {
    allowTrailingComma: true,
    disallowComments: false,
  });

  if (errors.length > 0) {
    const first = errors[0];
    throw new InstallerError(
      "settings_parse_failed",
      `Failed to parse Qwen settings at ${path}: ${printParseErrorCode(first.error)} at offset ${first.offset}.`,
    );
  }

  if (value === undefined) {
    return {};
  }

  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new InstallerError(
      "settings_parse_failed",
      `Qwen settings at ${path} must be a JSON object.`,
    );
  }

  return value as Record<string, unknown>;
}

export function stringifyJsonObject(value: Record<string, unknown>): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
