import assert from "node:assert/strict";
import test from "node:test";
import type { FileSystemDeps, HttpRequest } from "../../src/install/deps.js";
import { runInstallFlow } from "../../src/install/index.js";
import {
  LIVE_MODELS_WITH_UNKNOWN,
  UNKNOWN_LIVE_MODEL,
  modelsResponse,
} from "./model-fixtures.js";
import {
  createFakeInstallDependencies,
  createMemoryFileSystem,
} from "./test-deps.js";

function request(overrides = {}) {
  return {
    scope: "user" as const,
    yes: true,
    json: false,
    apiKeyStdin: false,
    dryRun: false,
    verifyLive: false,
    ...overrides,
  };
}

function depsForFlow(
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
        name === "GONKAGATE_API_KEY" ? "gp-flow-secret" : undefined,
      toObject: () => ({ GONKAGATE_API_KEY: "gp-flow-secret" }),
    },
    http: {
      request: async () => ({
        status: 200,
        headers: {},
        body: modelsResponse(LIVE_MODELS_WITH_UNKNOWN),
      }),
    },
    ...overrides,
  });
}

test("install flow writes user settings and returns success", async () => {
  const fs = createMemoryFileSystem();
  const result = await runInstallFlow(
    request({ modelKey: UNKNOWN_LIVE_MODEL.id }),
    depsForFlow({ fs }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "success");
  assert.equal(result.selectedModel, UNKNOWN_LIVE_MODEL.id);
  assert.equal(result.changed, true);
  assert.match(
    fs.files.get("/tmp/qwen-home/.qwen/settings.json") ?? "",
    /future\/network-model/,
  );
  assert.match(
    fs.files.get("/tmp/qwen-home/.gonkagate/qwen-code/install-state.json") ??
      "",
    /future\/network-model/,
  );
});

test("install flow writes project activation only and no project secret", async () => {
  const fs = createMemoryFileSystem();
  const result = await runInstallFlow(
    request({ scope: "project", modelKey: "minimaxai/minimax-m2.7" }),
    depsForFlow({ fs }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "success");
  const projectSettings =
    fs.files.get("/tmp/project/.qwen/settings.json") ?? "";
  assert.match(projectSettings, /minimaxai\/minimax-m2\.7/);
  assert.doesNotMatch(projectSettings, /GONKAGATE_API_KEY|gp-flow-secret/);
});

test("install flow dry-run does not write files", async () => {
  let writes = 0;
  const memory = createMemoryFileSystem();
  const fs: FileSystemDeps = {
    ...memory,
    writeFile: async (...args) => {
      writes += 1;
      await memory.writeFile(...args);
    },
  };
  const result = await runInstallFlow(
    request({ dryRun: true }),
    depsForFlow({ fs }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "dry-run");
  assert.equal(result.changed, false);
  assert.equal(writes, 0);
  assert.equal(memory.files.size, 0);
});

test("install flow dry-run reports current-session shadowing without writing", async () => {
  let writes = 0;
  const memory = createMemoryFileSystem();
  const result = await runInstallFlow(
    request({ dryRun: true, apiKeyStdin: true }),
    depsForFlow({
      fs: {
        ...memory,
        writeFile: async (...args) => {
          writes += 1;
          await memory.writeFile(...args);
        },
      },
      stdin: {
        isTTY: false,
        readAll: async () => "gp-stdin-secret",
      },
      env: {
        get: (name) =>
          name === "GONKAGATE_API_KEY" ? "gp-process-shadow" : undefined,
        toObject: () => ({ GONKAGATE_API_KEY: "gp-process-shadow" }),
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(result.status, "dry-run");
  assert.equal(writes, 0);
  assert.deepEqual(
    result.warnings.map((warning) => warning.code),
    ["secret_shadowed_by_process_env"],
  );
  assert.doesNotMatch(
    JSON.stringify(result),
    /gp-stdin-secret|gp-process-shadow/,
  );
});

test("install flow empty live model catalog fails before writes and picker", async () => {
  let writes = 0;
  let pickerCalls = 0;
  const memory = createMemoryFileSystem();
  const result = await runInstallFlow(
    request({ yes: false }),
    depsForFlow({
      fs: {
        ...memory,
        writeFile: async (...args) => {
          writes += 1;
          await memory.writeFile(...args);
        },
      },
      stdin: { isTTY: true, readAll: async () => "" },
      prompts: {
        secret: async () => "gp-flow-secret",
        select: async (_message, choices) => {
          pickerCalls += 1;
          return choices[0];
        },
      },
      http: {
        request: async () => ({
          status: 200,
          headers: {},
          body: JSON.stringify({ data: [] }),
        }),
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.status, "failed");
  if (!result.ok && result.status === "failed") {
    assert.equal(result.errorCode, "validated_models_unavailable");
  }
  assert.equal(writes, 0);
  assert.equal(pickerCalls, 0);
});

test("install flow can reuse existing managed key on --yes rerun", async () => {
  const requests: HttpRequest[] = [];
  const fs = createMemoryFileSystem({
    "/tmp/qwen-home/.qwen/settings.json": JSON.stringify({
      env: { GONKAGATE_API_KEY: "gp-existing-managed" },
    }),
  });
  const result = await runInstallFlow(
    request(),
    depsForFlow({
      fs,
      env: {
        get: () => undefined,
        toObject: () => ({}),
      },
      http: {
        request: async (httpRequest) => {
          requests.push(httpRequest);
          return {
            status: 200,
            headers: {},
            body: modelsResponse(),
          };
        },
      },
    }),
  );

  assert.equal(result.ok, true);
  assert.equal(
    requests[0]?.headers?.Authorization,
    "Bearer gp-existing-managed",
  );
});

test("install flow rolls back writes when durable verification fails", async () => {
  const memory = createMemoryFileSystem();
  const fs: FileSystemDeps = {
    ...memory,
    readFile: async (path) => {
      const value = await memory.readFile(path);
      if (path.endsWith("settings.json")) {
        return value.replace("modelProviders", "brokenProviders");
      }
      return value;
    },
  };
  const result = await runInstallFlow(request(), depsForFlow({ fs }));

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.blockers[0]?.code, "verification_incomplete");
  assert.equal(
    memory.files.get("/tmp/qwen-home/.qwen/settings.json"),
    undefined,
  );
});
