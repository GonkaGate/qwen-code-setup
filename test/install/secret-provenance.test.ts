import assert from "node:assert/strict";
import test from "node:test";
import type { FileSystemDeps } from "../../src/install/deps.js";
import {
  checkProcessEnvSecretShadow,
  checkProjectEnvSecretShadow,
  parseDotenvValue,
} from "../../src/install/secret-provenance.js";
import {
  createFakeInstallDependencies,
  createMemoryFileSystem,
} from "./test-deps.js";

function envWithSecret(value: string | undefined) {
  return {
    get: (name: string) => (name === "GONKAGATE_API_KEY" ? value : undefined),
    toObject: () => (value === undefined ? {} : { GONKAGATE_API_KEY: value }),
  };
}

test("process env provenance blocks only differing values", () => {
  const matching = checkProcessEnvSecretShadow(
    createFakeInstallDependencies({ env: envWithSecret("gp-managed") }),
    "gp-managed",
  );
  const missing = checkProcessEnvSecretShadow(
    createFakeInstallDependencies({ env: envWithSecret(undefined) }),
    "gp-managed",
  );
  const mismatch = checkProcessEnvSecretShadow(
    createFakeInstallDependencies({ env: envWithSecret("gp-shadow") }),
    "gp-managed",
  );

  assert.equal(matching, undefined);
  assert.equal(missing, undefined);
  assert.equal(mismatch?.code, "secret_shadowed_by_process_env");
  assert.doesNotMatch(JSON.stringify(mismatch), /gp-shadow|gp-managed/);
});

test("project env provenance uses selected trusted project env source", async () => {
  const fs = createMemoryFileSystem({
    "/repo/.qwen/.env": "GONKAGATE_API_KEY=gp-managed\n",
    "/repo/.env": "GONKAGATE_API_KEY=gp-shadow\n",
  });
  const blocker = await checkProjectEnvSecretShadow(
    createFakeInstallDependencies({ fs }),
    { projectRoot: "/repo" },
    "gp-managed",
    true,
  );

  assert.equal(blocker, undefined);
});

test("project env provenance blocks trusted shadowing without raw values", async () => {
  const fs = createMemoryFileSystem({
    "/repo/.env": "export GONKAGATE_API_KEY='gp-project-shadow'\n",
  });
  const blocker = await checkProjectEnvSecretShadow(
    createFakeInstallDependencies({ fs }),
    { projectRoot: "/repo" },
    "gp-managed",
    true,
  );

  assert.equal(blocker?.code, "secret_shadowed_by_project_env");
  assert.equal(blocker?.path, "/repo/.env");
  assert.doesNotMatch(JSON.stringify(blocker), /gp-project-shadow|gp-managed/);
});

test("project env provenance ignores missing or untrusted project env", async () => {
  const fs = createMemoryFileSystem({
    "/repo/.env": "GONKAGATE_API_KEY=gp-project-shadow\n",
  });
  const untrusted = await checkProjectEnvSecretShadow(
    createFakeInstallDependencies({ fs }),
    { projectRoot: "/repo" },
    "gp-managed",
    false,
  );
  const missing = await checkProjectEnvSecretShadow(
    createFakeInstallDependencies(),
    { projectRoot: "/repo" },
    "gp-managed",
    true,
  );

  assert.equal(untrusted, undefined);
  assert.equal(missing, undefined);
});

test("project env provenance fails closed on unreadable env evidence", async () => {
  const fs: FileSystemDeps = {
    ...createMemoryFileSystem({}),
    exists: async (path) => path === "/repo/.qwen/.env",
    readFile: async () => {
      throw new Error("permission denied gp-hidden");
    },
  };
  const blocker = await checkProjectEnvSecretShadow(
    createFakeInstallDependencies({ fs }),
    { projectRoot: "/repo" },
    "gp-managed",
    true,
  );

  assert.equal(blocker?.code, "verification_incomplete");
  assert.equal(blocker?.path, "/repo/.qwen/.env");
  assert.doesNotMatch(JSON.stringify(blocker), /gp-hidden|gp-managed/);
});

test("dotenv parser handles quoted values and comments", () => {
  assert.equal(
    parseDotenvValue(
      'OTHER=1\nGONKAGATE_API_KEY="gp-quoted"\n',
      "GONKAGATE_API_KEY",
    ),
    "gp-quoted",
  );
  assert.equal(
    parseDotenvValue(
      "GONKAGATE_API_KEY=gp-value # comment",
      "GONKAGATE_API_KEY",
    ),
    "gp-value",
  );
  assert.equal(parseDotenvValue("OTHER=1", "GONKAGATE_API_KEY"), undefined);
});
