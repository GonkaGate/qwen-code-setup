import { QWEN_CODE_SETUP_CONTRACT } from "../constants/contract.js";
import type { InstallDependencies, PlatformFacts } from "./deps.js";
import { getEnvValue } from "./deps.js";
import {
  detectRuntimePlatformKind,
  dirnamePlatformPath,
  joinPlatformPath,
  pathApiForPlatform,
  toAbsolutePlatformPath,
  type RuntimePlatformKind,
} from "./platform-path.js";

export interface ResolvedQwenPaths {
  readonly platformKind: RuntimePlatformKind;
  readonly cwd: string;
  readonly projectRoot: string;
  readonly userSettingsPath: string;
  readonly userSettingsPathSource: "default-home" | "qwen-home";
  readonly projectSettingsPath: string;
  readonly systemSettingsPath: string;
  readonly systemSettingsPathSource: "default" | "env";
  readonly systemDefaultsPath?: string;
  readonly installStatePath: string;
  readonly backupRootPath: string;
  readonly userBackupDir: string;
  readonly projectBackupDir: string;
}

export async function resolveQwenPaths(
  deps: InstallDependencies,
): Promise<ResolvedQwenPaths> {
  const facts = deps.platform;
  const envObject = deps.env.toObject();
  const cwd = toAbsolutePlatformPath(facts, facts.cwd);
  const projectRoot = await resolveProjectRoot(deps, cwd);
  const qwenHome = getEnvValue(envObject, "QWEN_HOME", facts.platform);
  const userSettingsRoot =
    qwenHome === undefined || qwenHome.trim() === ""
      ? joinPlatformPath(facts, facts.homeDir, ".qwen")
      : toAbsolutePlatformPath(facts, qwenHome.trim(), cwd);
  const systemSettingsOverride = getEnvValue(
    envObject,
    QWEN_CODE_SETUP_CONTRACT.qwenSystemSettingsPathEnvKey,
    facts.platform,
  );
  const systemDefaultsOverride = getEnvValue(
    envObject,
    QWEN_CODE_SETUP_CONTRACT.qwenSystemDefaultsPathEnvKey,
    facts.platform,
  );
  const backupRootPath = joinPlatformPath(
    facts,
    facts.homeDir,
    ".gonkagate",
    "qwen-code",
    "backups",
  );

  return {
    platformKind: detectRuntimePlatformKind(facts, deps.env),
    cwd,
    projectRoot,
    userSettingsPath: joinPlatformPath(
      facts,
      userSettingsRoot,
      "settings.json",
    ),
    userSettingsPathSource:
      qwenHome === undefined || qwenHome.trim() === ""
        ? "default-home"
        : "qwen-home",
    projectSettingsPath: joinPlatformPath(
      facts,
      projectRoot,
      ".qwen",
      "settings.json",
    ),
    systemSettingsPath:
      systemSettingsOverride === undefined ||
      systemSettingsOverride.trim() === ""
        ? getDefaultSystemSettingsPath(facts)
        : toAbsolutePlatformPath(facts, systemSettingsOverride.trim(), cwd),
    systemSettingsPathSource:
      systemSettingsOverride === undefined ||
      systemSettingsOverride.trim() === ""
        ? "default"
        : "env",
    systemDefaultsPath:
      systemDefaultsOverride === undefined ||
      systemDefaultsOverride.trim() === ""
        ? undefined
        : toAbsolutePlatformPath(facts, systemDefaultsOverride.trim(), cwd),
    installStatePath: joinPlatformPath(
      facts,
      facts.homeDir,
      ".gonkagate",
      "qwen-code",
      "install-state.json",
    ),
    backupRootPath,
    userBackupDir: joinPlatformPath(facts, backupRootPath, "user-settings"),
    projectBackupDir: joinPlatformPath(
      facts,
      backupRootPath,
      "project-settings",
    ),
  };
}

export async function resolveProjectRoot(
  deps: InstallDependencies,
  startCwd = toAbsolutePlatformPath(deps.platform, deps.platform.cwd),
): Promise<string> {
  const facts = deps.platform;
  let current = startCwd;

  while (true) {
    if (await deps.fs.exists(joinPlatformPath(facts, current, ".git"))) {
      return current;
    }

    const parent = dirnamePlatformPath(facts, current);
    if (parent === current) {
      return startCwd;
    }

    current = parent;
  }
}

export function getDefaultSystemSettingsPath(facts: PlatformFacts): string {
  if (facts.platform === "win32") {
    return "C:\\ProgramData\\qwen-code\\settings.json";
  }

  if (facts.platform === "darwin") {
    return "/Library/Application Support/QwenCode/settings.json";
  }

  return "/etc/qwen-code/settings.json";
}

export function isPathInside(
  facts: PlatformFacts,
  childPath: string,
  parentPath: string,
): boolean {
  const pathApi = pathApiForPlatform(facts);
  const relative = pathApi.relative(parentPath, childPath);

  return (
    relative === "" ||
    (!relative.startsWith("..") && !pathApi.isAbsolute(relative))
  );
}
