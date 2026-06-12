import type { InstallBlocker } from "./contracts/blockers.js";
import { createBlocker } from "./contracts/blockers.js";
import type { InstallDependencies } from "./deps.js";
import type {
  ManagedFileWriteResult,
  ManagedTextFilePlan,
} from "./managed-files.js";
import { writeManagedTextFile } from "./managed-files.js";

export type ManagedWriteTransactionResult =
  | {
      readonly ok: true;
      readonly results: readonly ManagedFileWriteResult[];
      readonly changed: boolean;
    }
  | {
      readonly ok: false;
      readonly blocker: InstallBlocker;
      readonly rollbackResults: readonly ManagedFileWriteResult[];
      readonly rollbackBlocker?: InstallBlocker;
    };

export async function applyManagedWriteTransaction(
  deps: InstallDependencies,
  plans: readonly ManagedTextFilePlan[],
): Promise<ManagedWriteTransactionResult> {
  const applied: ManagedFileWriteResult[] = [];
  const timestamp = deps.clock.isoNow();

  for (const plan of plans) {
    const outcome = await writeManagedTextFile(
      deps.fs,
      deps.platform,
      plan,
      timestamp,
    );

    if (!outcome.ok) {
      const rollback = await rollbackManagedWrites(deps, applied);
      return {
        ok: false,
        blocker: outcome.blocker,
        rollbackResults: rollback.results,
        ...(rollback.blocker === undefined
          ? {}
          : { rollbackBlocker: rollback.blocker }),
      };
    }

    applied.push(outcome.result);
  }

  return {
    ok: true,
    results: applied,
    changed: applied.some((result) => result.changed),
  };
}

export async function rollbackManagedWrites(
  deps: InstallDependencies,
  results: readonly ManagedFileWriteResult[],
): Promise<{
  readonly results: readonly ManagedFileWriteResult[];
  readonly blocker?: InstallBlocker;
}> {
  const rollbackResults: ManagedFileWriteResult[] = [];

  for (const result of [...results].reverse()) {
    if (!result.changed) {
      continue;
    }

    try {
      if (result.previousContents === undefined) {
        if (deps.fs.removeFile !== undefined) {
          await deps.fs.removeFile(result.path);
        }
      } else {
        await deps.fs.writeFile(result.path, result.previousContents, {
          mode: deps.platform.isWindows ? undefined : 0o600,
        });
      }
    } catch (error) {
      return {
        results: rollbackResults,
        blocker: transactionFailureBlocker(
          error instanceof Error ? error.message : "Managed rollback failed.",
        ),
      };
    }

    rollbackResults.push({
      ...result,
      changed: true,
    });
  }

  return { results: rollbackResults };
}

export function transactionFailureBlocker(message: string): InstallBlocker {
  return createBlocker({
    code: "managed_write_failed",
    layer: "managed-write-transaction",
    message,
  });
}
