import assert from "node:assert/strict";
import test from "node:test";
import { getRequiredGonkagateModelIds } from "../../src/constants/models.js";
import type { FileSystemDeps, HttpRequest } from "../../src/install/deps.js";
import { runPrewriteInstallFlow } from "../../src/install/prewrite-flow.js";
import {
  createFakeInstallDependencies,
  createMemoryFileSystem,
} from "./test-deps.js";

function request() {
  return {
    scope: "user" as const,
    yes: true,
    json: false,
    apiKeyStdin: false,
    dryRun: false,
    verifyLive: false,
  };
}

test("prewrite flow blocks missing required models before picker or writes", async () => {
  let writes = 0;
  let pickerCalls = 0;
  const memoryFs = createMemoryFileSystem();
  const fs: FileSystemDeps = {
    ...memoryFs,
    writeFile: async (...args) => {
      writes += 1;
      await memoryFs.writeFile(...args);
    },
  };
  const result = await runPrewriteInstallFlow(
    { ...request(), yes: false },
    createFakeInstallDependencies({
      fs,
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
          name === "GONKAGATE_API_KEY" ? "gp-flow-secret" : undefined,
        toObject: () => ({ GONKAGATE_API_KEY: "gp-flow-secret" }),
      },
      http: {
        request: async () => ({
          status: 200,
          headers: {},
          body: JSON.stringify({
            data: [{ id: "qwen/qwen3-235b-a22b-instruct-2507-fp8" }],
          }),
        }),
      },
      prompts: {
        secret: async () => "gp-flow-secret",
        select: async (_message, choices) => {
          pickerCalls += 1;
          return choices[0];
        },
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.blockers[0]?.code, "required_models_unavailable");
  assert.equal(writes, 0);
  assert.equal(pickerCalls, 0);
});

test("prewrite flow reaches runtime-not-implemented only after availability and selection", async () => {
  const requests: HttpRequest[] = [];
  const result = await runPrewriteInstallFlow(
    { ...request(), modelKey: "kimi-k2.6" },
    createFakeInstallDependencies({
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
          name === "GONKAGATE_API_KEY" ? "gp-flow-secret" : undefined,
        toObject: () => ({ GONKAGATE_API_KEY: "gp-flow-secret" }),
      },
      http: {
        request: async (httpRequest) => {
          requests.push(httpRequest);
          return {
            status: 200,
            headers: {},
            body: JSON.stringify({
              data: getRequiredGonkagateModelIds().map((id) => ({ id })),
            }),
          };
        },
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.selectedModel, "kimi-k2.6");
  assert.equal(result.blockers[0]?.code, "runtime_not_implemented");
  assert.equal(result.changed, false);
  assert.equal(result.managedPaths[0]?.kind, "user-settings");
  assert.equal(requests[0]?.headers?.Authorization, "Bearer gp-flow-secret");
});
