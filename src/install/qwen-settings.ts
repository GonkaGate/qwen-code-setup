import type { FileSystemDeps } from "./deps.js";
import { InstallerError } from "./errors.js";
import { parseJsoncObject, stringifyJsonObject } from "./jsonc.js";

export async function readQwenSettings(
  fs: FileSystemDeps,
  path: string,
): Promise<Record<string, unknown>> {
  if (!(await fs.exists(path))) {
    return {};
  }

  try {
    return parseJsoncObject(await fs.readFile(path), path);
  } catch (error) {
    if (error instanceof InstallerError) {
      throw error;
    }

    throw new InstallerError(
      "settings_parse_failed",
      `Failed to read Qwen settings at ${path}.`,
      { cause: error },
    );
  }
}

export function serializeQwenSettings(
  settings: Record<string, unknown>,
): string {
  return stringifyJsonObject(settings);
}
