import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import type { InstallBlocker } from "./contracts/blockers.js";
import type { InstallDependencies } from "./deps.js";
import { getEnvValue } from "./deps.js";
import { joinPlatformPath } from "./platform-path.js";
import type { ResolvedQwenPaths } from "./paths.js";
import {
  createSecretShadowedByProcessEnvBlocker,
  createSecretShadowedByProjectEnvBlocker,
  createUnreadableProjectEnvBlocker,
} from "./verification-blockers.js";

export function checkProcessEnvSecretShadow(
  deps: InstallDependencies,
  managedSecret: string,
): InstallBlocker | undefined {
  const current = getEnvValue(
    deps.env.toObject(),
    QWEN_CODE_SETUP_CONTRACT.qwenEnvKey,
    deps.platform.platform,
  );

  if (current !== undefined && current !== managedSecret) {
    return createSecretShadowedByProcessEnvBlocker();
  }

  return undefined;
}

export async function checkProjectEnvSecretShadow(
  deps: InstallDependencies,
  paths: Pick<ResolvedQwenPaths, "projectRoot">,
  managedSecret: string,
  trustedProject: boolean,
): Promise<InstallBlocker | undefined> {
  if (!trustedProject) {
    return undefined;
  }

  for (const envPath of getProjectEnvCandidatePaths(deps, paths.projectRoot)) {
    if (!(await deps.fs.exists(envPath))) {
      continue;
    }

    let contents: string;
    try {
      contents = await deps.fs.readFile(envPath);
    } catch {
      return createUnreadableProjectEnvBlocker(envPath);
    }

    const value = parseDotenvValue(
      contents,
      QWEN_CODE_SETUP_CONTRACT.qwenEnvKey,
    );

    if (value === undefined) {
      continue;
    }

    if (value !== managedSecret) {
      return createSecretShadowedByProjectEnvBlocker(envPath);
    }

    return undefined;
  }

  return undefined;
}

export function getProjectEnvCandidatePaths(
  deps: InstallDependencies,
  projectRoot: string,
): string[] {
  return [
    joinPlatformPath(deps.platform, projectRoot, ".qwen", ".env"),
    joinPlatformPath(deps.platform, projectRoot, ".env"),
  ];
}

export function parseDotenvValue(
  contents: string,
  key: string,
): string | undefined {
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(
      new RegExp(`^\\s*(?:export\\s+)?${escapeRegExp(key)}\\s*=\\s*(.*)\\s*$`),
    );

    if (match === null) {
      continue;
    }

    return unquoteDotenvValue(match[1].trim());
  }

  return undefined;
}

function unquoteDotenvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  const commentStart = value.search(/\s+#/);
  return commentStart === -1 ? value : value.slice(0, commentStart).trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
