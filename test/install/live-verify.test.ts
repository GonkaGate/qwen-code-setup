import assert from "node:assert/strict";
import test from "node:test";
import { verifyLiveIfRequested } from "../../src/install/live-verify.js";
import { createFakeInstallDependencies } from "./test-deps.js";

test("live verification is skipped unless explicitly requested", async () => {
  let calls = 0;
  const result = await verifyLiveIfRequested({
    deps: createFakeInstallDependencies({
      commands: {
        run: async () => {
          calls += 1;
          return { exitCode: 0, signal: null, stdout: "", stderr: "" };
        },
      },
    }),
    verifyLive: false,
    selectedModelId: "moonshotai/Kimi-K2.6",
  });

  assert.equal(result.ok, true);
  assert.equal(calls, 0);
  if (result.ok) {
    assert.equal(result.skipped, true);
  }
});

test("live verification uses selected model and redacts failures", async () => {
  const calls: Array<{ command: string; args: readonly string[] }> = [];
  const success = await verifyLiveIfRequested({
    deps: createFakeInstallDependencies({
      commands: {
        run: async (command, args) => {
          calls.push({ command, args });
          return { exitCode: 0, signal: null, stdout: "ok", stderr: "" };
        },
      },
    }),
    verifyLive: true,
    selectedModelId: "moonshotai/Kimi-K2.6",
  });
  const failure = await verifyLiveIfRequested({
    deps: createFakeInstallDependencies({
      commands: {
        run: async () => ({
          exitCode: 1,
          signal: null,
          stdout: "",
          stderr: "Authorization: Bearer gp-live-secret",
        }),
      },
    }),
    verifyLive: true,
    selectedModelId: "moonshotai/Kimi-K2.6",
  });

  assert.equal(success.ok, true);
  assert.equal(failure.ok, false);
  assert.equal(calls[0]?.command, "qwen");
  assert.deepEqual(calls[0]?.args, [
    "--model",
    "moonshotai/Kimi-K2.6",
    "--prompt",
    "ping",
  ]);

  if (!failure.ok) {
    assert.equal(failure.blocker.code, "live_verify_failed");
    assert.doesNotMatch(failure.blocker.message, /gp-live-secret/);
    assert.match(failure.blocker.message, /Bearer \[REDACTED\]/);
  }
});
