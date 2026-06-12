import assert from "node:assert/strict";
import test from "node:test";
import { verifyCurrentSession } from "../../src/install/verify-current-session.js";
import {
  createFakeInstallDependencies,
  createMemoryFileSystem,
} from "./test-deps.js";

test("current-session verifier reports process and trusted project shadowing as warnings", async () => {
  const warnings = await verifyCurrentSession({
    deps: createFakeInstallDependencies({
      env: {
        get: (name) =>
          name === "GONKAGATE_API_KEY" ? "gp-process-shadow" : undefined,
        toObject: () => ({ GONKAGATE_API_KEY: "gp-process-shadow" }),
      },
      fs: createMemoryFileSystem({
        "/repo/.qwen/.env": "GONKAGATE_API_KEY=gp-project-shadow\n",
      }),
    }),
    paths: { projectRoot: "/repo" },
    managedSecret: "gp-managed",
    trustedProject: true,
  });

  assert.deepEqual(
    warnings.map((warning) => warning.code),
    ["secret_shadowed_by_process_env", "secret_shadowed_by_project_env"],
  );
  assert.doesNotMatch(
    JSON.stringify(warnings),
    /gp-process-shadow|gp-project-shadow|gp-managed/,
  );
});

test("current-session verifier ignores aligned or untrusted env evidence", async () => {
  const warnings = await verifyCurrentSession({
    deps: createFakeInstallDependencies({
      env: {
        get: (name) =>
          name === "GONKAGATE_API_KEY" ? "gp-managed" : undefined,
        toObject: () => ({ GONKAGATE_API_KEY: "gp-managed" }),
      },
      fs: createMemoryFileSystem({
        "/repo/.env": "GONKAGATE_API_KEY=gp-shadow\n",
      }),
    }),
    paths: { projectRoot: "/repo" },
    managedSecret: "gp-managed",
    trustedProject: false,
  });

  assert.deepEqual(warnings, []);
});
