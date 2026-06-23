import assert from "node:assert/strict";
import test from "node:test";
import type {
  CommandRunResult,
  CommandRunnerDeps,
} from "../../src/install/deps.js";
import { detectQwen, parseQwenVersion } from "../../src/install/qwen.js";
import { createFakeInstallDependencies } from "./test-deps.js";

function commandRunner(
  handler: (
    command: string,
    args: readonly string[],
  ) => Promise<CommandRunResult>,
): CommandRunnerDeps {
  return {
    run: handler,
  };
}

test("qwen detector records installed version and config semantics", async () => {
  const calls: Array<{ command: string; args: readonly string[] }> = [];
  const deps = createFakeInstallDependencies({
    commands: commandRunner(async (command, args) => {
      calls.push({ command, args });
      return {
        exitCode: 0,
        signal: null,
        stdout: "qwen 0.18.0\n",
        stderr: "",
      };
    }),
  });

  const result = await detectQwen(deps);

  assert.equal(result.ok, true);
  assert.deepEqual(calls, [{ command: "qwen", args: ["--version"] }]);

  if (result.ok) {
    assert.equal(result.evidence.packageName, "@qwen-code/qwen-code");
    assert.equal(result.evidence.binaryName, "qwen");
    assert.equal(result.evidence.version, "0.18.0");
    assert.equal(result.evidence.packageNodeEngine, ">=22.0.0");
    assert.equal(
      result.evidence.configSemantics.modelProvidersMergeStrategy,
      "replace",
    );
    assert.equal(result.evidence.configSemantics.authCommandRemoved, true);
    assert.equal(result.evidence.configSemantics.statusSurface, "/doctor");
  }
});

test("qwen detector allows versions newer than the audited metadata", async () => {
  const result = await detectQwen(
    createFakeInstallDependencies({
      commands: commandRunner(async () => ({
        exitCode: 0,
        signal: null,
        stdout: "qwen 0.19.0\n",
        stderr: "",
      })),
    }),
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.evidence.version, "0.19.0");
    assert.equal(result.evidence.supportedVersion, "0.18.0");
  }
});

test("qwen detector blocks when command is missing or fails", async () => {
  const missing = await detectQwen(
    createFakeInstallDependencies({
      commands: commandRunner(async () => {
        throw new Error("spawn qwen ENOENT");
      }),
    }),
  );
  const failed = await detectQwen(
    createFakeInstallDependencies({
      commands: commandRunner(async () => ({
        exitCode: 127,
        signal: null,
        stdout: "",
        stderr: "not found",
      })),
    }),
  );

  assert.equal(missing.ok, false);
  assert.equal(failed.ok, false);

  if (!missing.ok && !failed.ok) {
    assert.equal(missing.blocker.code, "qwen_not_found");
    assert.equal(failed.blocker.code, "qwen_not_found");
    assert.doesNotMatch(missing.blocker.message, /gp-/);
  }
});

test("qwen detector blocks unexpected version output", async () => {
  const result = await detectQwen(
    createFakeInstallDependencies({
      commands: commandRunner(async () => ({
        exitCode: 0,
        signal: null,
        stdout: "Qwen Code dev build\n",
        stderr: "",
      })),
    }),
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.blocker.code, "qwen_version_unparseable");
    assert.equal(result.blocker.layer, "qwen-detection");
  }
});

test("qwen version parser accepts plain and prefixed semver output", () => {
  assert.equal(parseQwenVersion("0.18.0"), "0.18.0");
  assert.equal(parseQwenVersion("qwen-code v0.18.0"), "0.18.0");
  assert.equal(parseQwenVersion("unknown"), undefined);
});
