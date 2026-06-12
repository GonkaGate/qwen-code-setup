import type { CliOptions } from "./contracts.js";
import type { InstallFlowResult } from "../install/contracts/install-flow.js";
import {
  createNodeInstallDependencies,
  type InstallDependencies,
} from "../install/deps.js";
import { runInstallFlow } from "../install/index.js";

export async function executeCli(
  options: CliOptions,
  deps: InstallDependencies = createNodeInstallDependencies(),
): Promise<InstallFlowResult> {
  return runInstallFlow(options, deps);
}
