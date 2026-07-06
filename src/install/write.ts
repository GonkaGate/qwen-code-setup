import type { InstallScope } from "./contracts/install-flow.js";
import type { InstallDependencies } from "./deps.js";
import type { GonkagateModel } from "./gonkagate-client.js";
import type { ResolvedQwenPaths } from "./paths.js";
import { applyManagedWriteTransaction } from "./managed-write-transaction.js";
import { createWriteTargetConfigPlans } from "./write-target-config.js";

export async function writeManagedQwenSettings(input: {
  readonly deps: InstallDependencies;
  readonly paths: ResolvedQwenPaths;
  readonly scope: InstallScope;
  readonly selectedModelId: string;
  readonly secretValue: string;
  readonly models: readonly GonkagateModel[];
}) {
  const plans = await createWriteTargetConfigPlans(input);

  if (!plans.ok) {
    return plans;
  }

  return applyManagedWriteTransaction(input.deps, plans.plans);
}
