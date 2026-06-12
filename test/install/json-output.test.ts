import assert from "node:assert/strict";
import test from "node:test";
import { renderInstallResult } from "../../src/cli/render.js";
import type { InstallFlowResult } from "../../src/install/contracts/install-flow.js";

const base = {
  runtimeImplemented: true,
  scope: "user" as const,
  selectedModel: "kimi-k2.6" as const,
  managedPaths: [
    {
      kind: "user-settings" as const,
      path: "/home/alice/.qwen/settings.json",
      changed: true,
    },
  ],
  changed: true,
  warnings: [],
};

const options = {
  scope: "user" as const,
  modelKey: "kimi-k2.6" as const,
  yes: true,
  json: true,
  apiKeyStdin: false,
  dryRun: false,
  verifyLive: false,
};

test("JSON renderer emits stable fields for all installer result variants", () => {
  const variants: InstallFlowResult[] = [
    {
      ...base,
      ok: true,
      status: "success",
      blockers: [],
    },
    {
      ...base,
      ok: true,
      status: "dry-run",
      blockers: [],
      changed: false,
    },
    {
      ...base,
      ok: true,
      status: "verification-warning",
      blockers: [],
      warnings: [
        {
          code: "secret_shadowed_by_process_env",
          message: "GONKAGATE_API_KEY is shadowed",
          layer: "process.env",
        },
      ],
    },
    {
      ...base,
      ok: false,
      status: "blocked",
      blockers: [
        {
          code: "required_models_unavailable",
          message: "missing",
          layer: "model-discovery",
        },
      ],
    },
    {
      ...base,
      ok: false,
      status: "failed",
      blockers: [],
      errorCode: "validated_models_unavailable",
      message: "Authorization: Bearer gp-json-secret",
    },
  ];

  for (const result of variants) {
    const rendered = renderInstallResult(result, options);
    const payload = JSON.parse(rendered.stdout) as Record<string, unknown>;

    assert.equal(rendered.stderr, "");
    assert.equal(payload.ok, result.ok);
    assert.equal(payload.status, result.status);
    assert.equal(payload.scope, "user");
    assert.equal(payload.selectedModel, "kimi-k2.6");
    assert.ok(Array.isArray(payload.managedPaths));
    assert.ok(Array.isArray(payload.blockers));
    assert.ok(Array.isArray(payload.warnings));
    assert.doesNotMatch(rendered.stdout, /gp-json-secret/);
  }
});
