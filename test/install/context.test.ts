import assert from "node:assert/strict";
import test from "node:test";
import { resolveInstallContext } from "../../src/install/context.js";
import { createFakeInstallDependencies } from "./test-deps.js";

test("install context combines qwen evidence, paths, and compatibility", async () => {
  const context = await resolveInstallContext(
    createFakeInstallDependencies({
      commands: {
        run: async () => ({
          exitCode: 0,
          signal: null,
          stdout: "0.18.0\n",
          stderr: "",
        }),
      },
    }),
  );

  assert.equal(context.ok, true);
  if (context.ok) {
    assert.equal(context.context.qwen.version, "0.18.0");
    assert.equal(
      context.context.paths.userSettingsPath,
      "/tmp/qwen-home/.qwen/settings.json",
    );
    assert.equal(
      context.context.compatibility.modelProvidersMergeStrategy,
      "replace",
    );
  }
});

test("install context returns qwen blocker before path-dependent runtime work", async () => {
  const context = await resolveInstallContext(
    createFakeInstallDependencies({
      commands: {
        run: async () => {
          throw new Error("spawn qwen ENOENT");
        },
      },
    }),
  );

  assert.equal(context.ok, false);
  if (!context.ok) {
    assert.equal(context.blockers[0].code, "qwen_not_found");
  }
});
