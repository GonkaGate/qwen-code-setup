import { posix, win32 } from "node:path";
import type { PlatformFacts, RuntimeEnvironmentDeps } from "./deps.js";
import { getEnvValue } from "./deps.js";

export type RuntimePlatformKind = "linux" | "macos" | "windows" | "wsl";

export function pathApiForPlatform(facts: PlatformFacts): typeof posix {
  return facts.isWindows ? win32 : posix;
}

export function resolvePlatformPath(
  facts: PlatformFacts,
  ...segments: readonly string[]
): string {
  const pathApi = pathApiForPlatform(facts);
  return pathApi.resolve(...segments);
}

export function joinPlatformPath(
  facts: PlatformFacts,
  ...segments: readonly string[]
): string {
  const pathApi = pathApiForPlatform(facts);
  return pathApi.join(...segments);
}

export function dirnamePlatformPath(
  facts: PlatformFacts,
  path: string,
): string {
  return pathApiForPlatform(facts).dirname(path);
}

export function isAbsolutePlatformPath(
  facts: PlatformFacts,
  path: string,
): boolean {
  return pathApiForPlatform(facts).isAbsolute(path);
}

export function normalizePlatformPath(
  facts: PlatformFacts,
  path: string,
): string {
  return pathApiForPlatform(facts).normalize(path);
}

export function toAbsolutePlatformPath(
  facts: PlatformFacts,
  path: string,
  base = facts.homeDir,
): string {
  if (isAbsolutePlatformPath(facts, path)) {
    return normalizePlatformPath(facts, path);
  }

  return resolvePlatformPath(facts, base, path);
}

export function detectRuntimePlatformKind(
  facts: PlatformFacts,
  env: RuntimeEnvironmentDeps,
): RuntimePlatformKind {
  if (facts.platform === "win32") {
    return "windows";
  }

  if (facts.platform === "darwin") {
    return "macos";
  }

  const envObject = env.toObject();
  const wslName = getEnvValue(envObject, "WSL_DISTRO_NAME", facts.platform);
  const wslInterop = getEnvValue(envObject, "WSL_INTEROP", facts.platform);

  if (
    facts.platform === "linux" &&
    (wslName !== undefined || wslInterop !== undefined)
  ) {
    return "wsl";
  }

  return "linux";
}
