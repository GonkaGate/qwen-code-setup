import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";
import type { FileSystemDeps, PlatformFacts } from "./deps.js";
import { isPathInside } from "./paths.js";
import { dirnamePlatformPath } from "./platform-path.js";

export interface ManagedTextFilePlan {
  readonly kind: "user-settings" | "project-settings" | "install-state";
  readonly path: string;
  readonly contents: string;
  readonly backupDir?: string;
  readonly mode?: number;
  readonly requireUserProfile?: boolean;
}

export interface ManagedFileWriteResult {
  readonly kind: ManagedTextFilePlan["kind"];
  readonly path: string;
  readonly changed: boolean;
  readonly backupPath?: string;
  readonly previousContents?: string;
}

export type ManagedFileWriteOutcome =
  | {
      readonly ok: true;
      readonly result: ManagedFileWriteResult;
    }
  | {
      readonly ok: false;
      readonly blocker: InstallBlocker;
    };

export async function writeManagedTextFile(
  fs: FileSystemDeps,
  facts: PlatformFacts,
  plan: ManagedTextFilePlan,
  timestamp: string,
): Promise<ManagedFileWriteOutcome> {
  if (
    plan.requireUserProfile === true &&
    !isPathInside(facts, plan.path, facts.homeDir)
  ) {
    return {
      ok: false,
      blocker: createBlocker({
        code: "managed_write_failed",
        layer: "managed-files",
        path: plan.path,
        message:
          "Native Windows managed user file target is outside the current user profile.",
      }),
    };
  }

  const existed = await fs.exists(plan.path);
  const previousContents = existed ? await fs.readFile(plan.path) : undefined;

  if (previousContents === plan.contents) {
    if (plan.mode !== undefined && fs.chmod !== undefined) {
      await fs.chmod(plan.path, plan.mode);
    }

    return {
      ok: true,
      result: {
        kind: plan.kind,
        path: plan.path,
        changed: false,
        previousContents,
      },
    };
  }

  const backupPath =
    existed && plan.backupDir !== undefined
      ? `${plan.backupDir}/${sanitizeTimestamp(timestamp)}-${sanitizeFileName(
          plan.path,
        )}.bak`
      : undefined;

  try {
    await fs.mkdir(dirnamePlatformPath(facts, plan.path), {
      recursive: true,
      mode: plan.mode === undefined ? undefined : 0o700,
    });

    if (backupPath !== undefined && previousContents !== undefined) {
      await fs.mkdir(dirnamePlatformPath(facts, backupPath), {
        recursive: true,
        mode: 0o700,
      });
      await fs.writeFile(backupPath, previousContents, { mode: plan.mode });
    }

    await fs.writeFile(plan.path, plan.contents, { mode: plan.mode });

    if (plan.mode !== undefined && fs.chmod !== undefined) {
      await fs.chmod(plan.path, plan.mode);
    }

    return {
      ok: true,
      result: {
        kind: plan.kind,
        path: plan.path,
        changed: true,
        backupPath,
        previousContents,
      },
    };
  } catch (error) {
    return {
      ok: false,
      blocker: createBlocker({
        code: "managed_write_failed",
        layer: "managed-files",
        path: plan.path,
        message:
          error instanceof Error ? error.message : "Managed file write failed.",
      }),
    };
  }
}

function sanitizeTimestamp(timestamp: string): string {
  return timestamp.replace(/[:.]/g, "-");
}

function sanitizeFileName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).join("__");
}
