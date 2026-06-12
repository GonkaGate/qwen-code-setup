import type {
  InstallScope,
  ManagedPathSummary,
} from "./contracts/install-flow.js";
import type { ManagedTextFilePlan } from "./managed-files.js";
import { redactSecrets } from "./redact.js";

export interface DryRunPlanSummary {
  readonly scope: InstallScope;
  readonly managedPaths: readonly ManagedPathSummary[];
  readonly plannedWrites: readonly {
    readonly kind: ManagedPathSummary["kind"];
    readonly path: string;
    readonly backupDir?: string;
    readonly redactedPreview: string;
  }[];
  readonly changed: false;
}

export function createDryRunPlanSummary(
  scope: InstallScope,
  plans: readonly ManagedTextFilePlan[],
): DryRunPlanSummary {
  return {
    scope,
    managedPaths: plans.map((plan) => ({
      kind: plan.kind,
      path: plan.path,
      changed: false,
    })),
    plannedWrites: plans.map((plan) => ({
      kind: plan.kind,
      path: plan.path,
      ...(plan.backupDir === undefined ? {} : { backupDir: plan.backupDir }),
      redactedPreview: redactSecrets(plan.contents),
    })),
    changed: false,
  };
}
