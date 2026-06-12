import assert from "node:assert/strict";
import test from "node:test";
import {
  createNodeCommandRunner,
  getEnvValue,
  normalizeEnvironment,
  resolveCommandCandidates,
} from "../../src/install/deps.js";
import { createTempInstallHarness } from "./harness.js";
import { createFakeInstallDependencies } from "./test-deps.js";

test("Windows environment lookup is case-insensitive", () => {
  const env = { Path: "C:\\bin", pathext: ".EXE;.CMD;.BAT" };

  assert.equal(getEnvValue(env, "PATH", "win32"), "C:\\bin");
  assert.equal(getEnvValue(env, "PATHEXT", "win32"), ".EXE;.CMD;.BAT");
  assert.equal(getEnvValue(env, "PATH", "linux"), undefined);
  assert.deepEqual(normalizeEnvironment(env, "win32"), {
    PATH: "C:\\bin",
    PATHEXT: ".EXE;.CMD;.BAT",
  });
});

test("Windows command candidates include PATHEXT script extensions", () => {
  assert.deepEqual(
    resolveCommandCandidates("qwen", { PATHEXT: ".EXE;.CMD;.BAT" }, "win32"),
    ["qwen.EXE", "qwen.CMD", "qwen.BAT"],
  );
  assert.deepEqual(resolveCommandCandidates("qwen.cmd", {}, "win32"), [
    "qwen.cmd",
  ]);
  assert.deepEqual(resolveCommandCandidates("qwen", {}, "linux"), ["qwen"]);
});

test("node command runner hides Windows process windows by default", async () => {
  const runner = createNodeCommandRunner({
    platform: "win32",
    arch: "x64",
    pathDelimiter: ";",
    isWindows: true,
    homeDir: "C:\\Users\\Test",
    tmpDir: "C:\\Temp",
    cwd: "C:\\repo",
  });
  const result = await runner.run(process.execPath, ["--version"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /^v\d+/);
});

test("fake dependency harness avoids real home, network, and qwen process", async () => {
  const deps = createFakeInstallDependencies();
  const command = await deps.commands.run("qwen", ["--version"]);
  const response = await deps.http.request({
    method: "GET",
    url: "https://example.test/models",
  });

  assert.equal(command.exitCode, 0);
  assert.equal(response.status, 200);
  assert.equal(deps.platform.homeDir, "/tmp/qwen-home");
});

test("temp harness creates isolated home, project, and fake qwen", () => {
  const harness = createTempInstallHarness();

  try {
    assert.match(harness.home, /qwen-code-setup-/);
    assert.match(harness.project, /qwen-code-setup-/);
    assert.match(harness.qwenBin, /qwen$/);
    assert.equal(harness.deps.platform.homeDir, harness.home);
  } finally {
    harness.cleanup();
  }
});
