import assert from "node:assert/strict";
import test from "node:test";
import { runCli } from "../src/cli.js";
import { QWEN_CODE_SETUP_CONTRACT } from "../src/constants/contract.js";
import { LIVE_MODELS, modelsResponse } from "./install/model-fixtures.js";
import { createFakeInstallDependencies } from "./install/test-deps.js";

function createOutput() {
  const writes: string[] = [];

  return {
    stream: {
      write(chunk: string | Uint8Array): boolean {
        writes.push(String(chunk));
        return true;
      },
    },
    text() {
      return writes.join("");
    },
  };
}

function cliDeps(
  overrides: Parameters<typeof createFakeInstallDependencies>[0] = {},
) {
  return createFakeInstallDependencies({
    commands: {
      run: async () => ({
        exitCode: 0,
        signal: null,
        stdout: "0.18.0\n",
        stderr: "",
      }),
    },
    env: {
      get: (name) =>
        name === "GONKAGATE_API_KEY" ? "gp-cli-secret" : undefined,
      toObject: () => ({ GONKAGATE_API_KEY: "gp-cli-secret" }),
    },
    http: {
      request: async () => ({
        status: 200,
        headers: {},
        body: modelsResponse(),
      }),
    },
    ...overrides,
  });
}

test("CLI renders successful human setup guidance", async () => {
  const stdout = createOutput();
  const stderr = createOutput();

  const result = await runCli(
    ["node", "gonkagate-qwen-code", "--scope", "user", "--yes"],
    {
      stdout: stdout.stream,
      stderr: stderr.stream,
    },
    cliDeps(),
  );

  assert.equal(result.exitCode, 0);
  assert.equal(stderr.text(), "");
  assert.match(stdout.text(), /Qwen Code is configured/);
  assert.match(stdout.text(), /Run: qwen/);
  assert.doesNotMatch(stdout.text(), /gp-cli-secret/);
});

test("CLI renders machine-readable install state", async () => {
  const stdout = createOutput();
  const stderr = createOutput();

  const result = await runCli(
    ["node", "gonkagate-qwen-code", "--json", "--scope", "user", "--yes"],
    {
      stdout: stdout.stream,
      stderr: stderr.stream,
    },
    cliDeps(),
  );

  assert.equal(result.exitCode, 0);
  assert.equal(stderr.text(), "");

  const payload = JSON.parse(stdout.text()) as {
    packageName?: string;
    runtimeImplemented?: boolean;
    status?: string;
    selectedModel?: string;
  };

  assert.equal(payload.packageName, "@gonkagate/qwen-code-setup");
  assert.equal(payload.runtimeImplemented, true);
  assert.equal(payload.status, "success");
  assert.equal(payload.selectedModel, LIVE_MODELS[0].id);
  assert.doesNotMatch(stdout.text(), /gp-cli-secret/);
});

test("CLI supports JSON dry-run with project scope and stdin secret", async () => {
  const stdout = createOutput();
  const stderr = createOutput();

  const result = await runCli(
    [
      "node",
      "gonkagate-qwen-code",
      "--json",
      "--scope",
      "project",
      "--model",
      "minimaxai/minimax-m2.7",
      "--yes",
      "--dry-run",
      "--verify-live",
      "--api-key-stdin",
    ],
    {
      stdout: stdout.stream,
      stderr: stderr.stream,
    },
    cliDeps({
      stdin: {
        isTTY: false,
        readAll: async () => "gp-stdin-cli-secret",
      },
    }),
  );

  assert.equal(result.exitCode, 0);
  assert.equal(stderr.text(), "");

  const payload = JSON.parse(stdout.text()) as {
    status?: string;
    scope?: string;
    selectedModel?: string;
    managedPaths?: Array<{ kind?: string }>;
  };

  assert.equal(payload.status, "dry-run");
  assert.equal(payload.scope, "project");
  assert.equal(payload.selectedModel, "minimaxai/minimax-m2.7");
  assert.deepEqual(
    payload.managedPaths?.map((path) => path.kind),
    ["user-settings", "project-settings", "install-state"],
  );
  assert.doesNotMatch(stdout.text(), /gp-stdin-cli-secret/);
});

test("CLI uses the first live model default with --yes", async () => {
  const stdout = createOutput();
  const stderr = createOutput();

  const result = await runCli(
    ["node", "gonkagate-qwen-code", "--json", "--yes"],
    {
      stdout: stdout.stream,
      stderr: stderr.stream,
    },
    cliDeps(),
  );

  assert.equal(result.exitCode, 0);
  assert.equal(stderr.text(), "");

  const payload = JSON.parse(stdout.text()) as { selectedModel?: string };
  assert.equal(payload.selectedModel, LIVE_MODELS[0].id);
});

test("CLI rejects forbidden secret and custom-provider options before execution", async () => {
  for (const option of ["--api-key", "--base-url", "--model-id"]) {
    const stdout = createOutput();
    const stderr = createOutput();

    const result = await runCli(["node", "gonkagate-qwen-code", option, "x"], {
      stdout: stdout.stream,
      stderr: stderr.stream,
    });

    assert.equal(result.exitCode, 2);
    assert.equal(stdout.text(), "");
    assert.match(stderr.text(), new RegExp(option));
    assert.match(stderr.text(), /forbidden/);
  }
});

test("CLI rejects invalid scope before execution and unavailable live model after fetch", async () => {
  const invalidScopeStdout = createOutput();
  const invalidScopeStderr = createOutput();

  const invalidScope = await runCli(
    ["node", "gonkagate-qwen-code", "--scope", "system"],
    {
      stdout: invalidScopeStdout.stream,
      stderr: invalidScopeStderr.stream,
    },
  );

  assert.equal(invalidScope.exitCode, 2);
  assert.match(invalidScopeStderr.text(), /Unsupported scope/);

  const invalidModelStdout = createOutput();
  const invalidModelStderr = createOutput();

  const invalidModel = await runCli(
    ["node", "gonkagate-qwen-code", "--model", "raw/custom-model", "--yes"],
    {
      stdout: invalidModelStdout.stream,
      stderr: invalidModelStderr.stream,
    },
    cliDeps(),
  );

  assert.equal(invalidModel.exitCode, 1);
  assert.match(invalidModelStderr.text(), /validated_models_unavailable/);
});

test("CLI renders parse errors as JSON on stdout in JSON mode", async () => {
  const stdout = createOutput();
  const stderr = createOutput();

  const result = await runCli(
    ["node", "gonkagate-qwen-code", "--json", "--api-key=gp-secret-value"],
    {
      stdout: stdout.stream,
      stderr: stderr.stream,
    },
  );

  assert.equal(result.exitCode, 2);
  assert.equal(stderr.text(), "");

  const payload = JSON.parse(stdout.text()) as {
    errorCode?: string;
    message?: string;
  };

  assert.equal(payload.errorCode, "forbidden_option");
  assert.doesNotMatch(stdout.text(), /gp-secret-value/);
  assert.match(payload.message ?? "", /gp-\*\*\*/);
});

test("CLI renders live model fetch failures without leaking secrets", async () => {
  const stdout = createOutput();
  const stderr = createOutput();

  const result = await runCli(
    ["node", "gonkagate-qwen-code", "--scope", "user", "--yes"],
    {
      stdout: stdout.stream,
      stderr: stderr.stream,
    },
    cliDeps({
      http: {
        request: async () => ({
          status: 200,
          headers: {},
          body: JSON.stringify({ data: [] }),
        }),
      },
    }),
  );

  assert.equal(result.exitCode, 1);
  assert.equal(stdout.text(), "");
  assert.match(stderr.text(), /validated_models_unavailable/);
  assert.doesNotMatch(stderr.text(), /gp-cli-secret/);
});

test("CLI renders help and version without installer execution", async () => {
  const helpStdout = createOutput();
  const helpStderr = createOutput();

  const help = await runCli(["node", "gonkagate-qwen-code", "--help"], {
    stdout: helpStdout.stream,
    stderr: helpStderr.stream,
  });

  assert.equal(help.exitCode, 0);
  assert.match(helpStdout.text(), /Usage: gonkagate-qwen-code/);
  assert.equal(helpStderr.text(), "");

  const versionStdout = createOutput();
  const versionStderr = createOutput();

  const version = await runCli(["node", "gonkagate-qwen-code", "--version"], {
    stdout: versionStdout.stream,
    stderr: versionStderr.stream,
  });

  assert.equal(version.exitCode, 0);
  assert.equal(
    versionStdout.text(),
    `${QWEN_CODE_SETUP_CONTRACT.packageVersion}\n`,
  );
  assert.equal(versionStderr.text(), "");
});
