import assert from "node:assert/strict";
import test from "node:test";
import { runCli } from "../../src/cli.js";
import { redactedJsonStringify } from "../../src/install/redact.js";
import {
  normalizeSecret,
  resolveGonkagateApiKey,
} from "../../src/install/secrets.js";
import { createFakeInstallDependencies } from "./test-deps.js";

test("secret intake reads exactly one trimmed --api-key-stdin value", async () => {
  const result = await resolveGonkagateApiKey(
    { apiKeyStdin: true },
    createFakeInstallDependencies({
      stdin: {
        isTTY: false,
        readAll: async () => " \n gp-stdin-secret \n",
      },
    }),
  );

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.secret.source, "api-key-stdin");
    assert.equal(result.secret.value, "gp-stdin-secret");
  }
});

test("secret intake rejects empty or multiple stdin values without leaking", () => {
  for (const raw of ["", " \n", "gp-one\n gp-two"]) {
    const result = normalizeSecret(raw, "api-key-stdin");

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.blocker.code, "secret_missing");
      assert.doesNotMatch(JSON.stringify(result.blocker), /gp-one|gp-two/);
    }
  }
});

test("secret intake accepts env and gives explicit stdin precedence", async () => {
  const env = {
    get: (name: string) =>
      name === "GONKAGATE_API_KEY" ? "gp-env-secret" : undefined,
    toObject: () => ({ GONKAGATE_API_KEY: "gp-env-secret" }),
  };
  const envResult = await resolveGonkagateApiKey(
    { apiKeyStdin: false },
    createFakeInstallDependencies({ env }),
  );
  const stdinResult = await resolveGonkagateApiKey(
    { apiKeyStdin: true },
    createFakeInstallDependencies({
      env,
      stdin: {
        isTTY: false,
        readAll: async () => "gp-stdin-secret",
      },
    }),
  );

  assert.equal(envResult.ok, true);
  assert.equal(stdinResult.ok, true);

  if (envResult.ok && stdinResult.ok) {
    assert.equal(envResult.secret.source, "env");
    assert.equal(envResult.secret.value, "gp-env-secret");
    assert.equal(stdinResult.secret.source, "api-key-stdin");
    assert.equal(stdinResult.secret.value, "gp-stdin-secret");
    assert.doesNotMatch(redactedJsonStringify(stdinResult), /gp-stdin-secret/);
  }
});

test("secret intake uses hidden prompt only in TTY mode", async () => {
  const prompted = await resolveGonkagateApiKey(
    { apiKeyStdin: false },
    createFakeInstallDependencies({
      stdin: {
        isTTY: true,
        readAll: async () => "",
      },
      prompts: {
        secret: async (message) => {
          assert.match(message, /GonkaGate API key/);
          return "gp-prompt-secret";
        },
        select: async (_message, choices) => choices[0],
      },
    }),
  );
  const nonTty = await resolveGonkagateApiKey(
    { apiKeyStdin: false },
    createFakeInstallDependencies(),
  );

  assert.equal(prompted.ok, true);
  assert.equal(nonTty.ok, false);

  if (prompted.ok && !nonTty.ok) {
    assert.equal(prompted.secret.source, "hidden-prompt");
    assert.equal(prompted.secret.value, "gp-prompt-secret");
    assert.equal(nonTty.blocker.code, "secret_missing");
  }
});

test("plain --api-key remains rejected before secret intake", async () => {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const result = await runCli(
    ["node", "gonkagate-qwen-code", "--api-key=gp-raw"],
    {
      stdout: {
        write: (chunk: string | Uint8Array) => stdout.push(String(chunk)),
      },
      stderr: {
        write: (chunk: string | Uint8Array) => stderr.push(String(chunk)),
      },
    },
  );

  assert.equal(result.exitCode, 2);
  assert.equal(stdout.join(""), "");
  assert.doesNotMatch(stderr.join(""), /gp-raw/);
});
