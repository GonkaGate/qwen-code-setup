import assert from "node:assert/strict";
import test from "node:test";
import { renderInstallResult } from "../../src/cli/render.js";
import type { CliOptions } from "../../src/cli/contracts.js";
import type { InstallFlowResult } from "../../src/install/contracts/install-flow.js";

const jsonOptions: CliOptions = {
  json: true,
  yes: true,
  apiKeyStdin: false,
  dryRun: false,
  verifyLive: false,
  scope: "user",
  modelKey: "qwen3-235b-a22b-instruct-2507-fp8",
};

const baseResult = {
  runtimeImplemented: true,
  scope: "user",
  selectedModel: "qwen3-235b-a22b-instruct-2507-fp8",
  managedPaths: [],
  changed: false,
  warnings: [],
} as const;

test("JSON result contract covers all installer status variants", () => {
  const variants: readonly InstallFlowResult[] = [
    {
      ...baseResult,
      ok: true,
      status: "success",
      blockers: [],
    },
    {
      ...baseResult,
      ok: true,
      status: "dry-run",
      blockers: [],
    },
    {
      ...baseResult,
      ok: true,
      status: "verification-warning",
      blockers: [],
      warnings: [
        {
          code: "secret_shadowed_by_process_env",
          message: "Current process env shadows settings.env.",
        },
      ],
    },
    {
      ...baseResult,
      ok: false,
      status: "blocked",
      blockers: [
        {
          code: "required_models_unavailable",
          message: "Missing required model ids.",
        },
      ],
    },
    {
      ...baseResult,
      ok: false,
      status: "failed",
      errorCode: "managed_write_failed",
      message: "write failed for gp-secret-value",
      blockers: [],
    },
  ];

  for (const result of variants) {
    const rendered = renderInstallResult(result, jsonOptions);
    const payload = JSON.parse(rendered.stdout) as {
      ok?: boolean;
      status?: string;
      scope?: string;
      selectedModel?: string;
      managedPaths?: unknown[];
      changed?: boolean;
      blockers?: unknown[];
      warnings?: unknown[];
    };

    assert.equal(payload.ok, result.ok);
    assert.equal(payload.status, result.status);
    assert.equal(payload.scope, "user");
    assert.equal(payload.selectedModel, "qwen3-235b-a22b-instruct-2507-fp8");
    assert.deepEqual(payload.managedPaths, []);
    assert.equal(payload.changed, false);
    assert.ok(Array.isArray(payload.blockers));
    assert.ok(Array.isArray(payload.warnings));
    assert.doesNotMatch(rendered.stdout, /gp-secret-value/);
    assert.equal(rendered.stderr, "");
  }
});
