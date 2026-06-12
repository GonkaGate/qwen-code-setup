import { executeCli } from "./cli/execute.js";
import { createCli, parseCliArguments } from "./cli/parse.js";
import { renderInstallResult, renderParseError } from "./cli/render.js";
import type { CliIo, CliResult } from "./cli/contracts.js";
import { isEntrypointInvocation } from "./entrypoint.js";
import type { InstallDependencies } from "./install/deps.js";

export type { CliIo, CliResult, CliWritable } from "./cli/contracts.js";
export { createCli };

export async function runCli(
  argv: readonly string[] = process.argv,
  io: CliIo = { stdout: process.stdout, stderr: process.stderr },
  deps?: InstallDependencies,
): Promise<CliResult> {
  const parsed = parseCliArguments(argv);

  if (parsed.kind === "early-exit") {
    io.stdout.write(parsed.stdout);
    io.stderr.write(parsed.stderr);
    return { exitCode: parsed.exitCode };
  }

  if (parsed.kind === "parse-error") {
    const rendered = renderParseError(parsed.error);
    io.stdout.write(rendered.stdout);
    io.stderr.write(rendered.stderr);
    return { exitCode: rendered.exitCode };
  }

  const installResult = await executeCli(parsed.options, deps);
  const rendered = renderInstallResult(installResult, parsed.options);
  io.stdout.write(rendered.stdout);
  io.stderr.write(rendered.stderr);

  return { exitCode: rendered.exitCode };
}

if (isEntrypointInvocation(import.meta.url, process.argv[1])) {
  const result = await runCli();
  process.exitCode = result.exitCode;
}
