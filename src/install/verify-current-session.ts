import type { InstallWarning } from "./contracts/install-flow.js";
import type { InstallDependencies } from "./deps.js";
import type { ResolvedQwenPaths } from "./paths.js";
import {
  checkProcessEnvSecretShadow,
  checkProjectEnvSecretShadow,
} from "./secret-provenance.js";

export async function verifyCurrentSession(input: {
  readonly deps: InstallDependencies;
  readonly paths: Pick<ResolvedQwenPaths, "projectRoot">;
  readonly managedSecret: string;
  readonly trustedProject: boolean;
}): Promise<InstallWarning[]> {
  const warnings: InstallWarning[] = [];
  const processBlocker = checkProcessEnvSecretShadow(
    input.deps,
    input.managedSecret,
  );
  const projectBlocker = await checkProjectEnvSecretShadow(
    input.deps,
    input.paths,
    input.managedSecret,
    input.trustedProject,
  );

  for (const blocker of [processBlocker, projectBlocker]) {
    if (blocker !== undefined) {
      warnings.push({
        code: blocker.code,
        layer: blocker.layer,
        message: blocker.message,
      });
    }
  }

  return warnings;
}
