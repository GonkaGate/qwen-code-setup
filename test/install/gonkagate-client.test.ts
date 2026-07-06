import assert from "node:assert/strict";
import test from "node:test";
import type { HttpRequest } from "../../src/install/deps.js";
import {
  extractModelsFromModelsResponse,
  fetchGonkagateModels,
} from "../../src/install/gonkagate-client.js";
import { createFakeInstallDependencies } from "./test-deps.js";

test("GonkaGate models client sends authenticated GET request through HTTP adapter", async () => {
  const requests: HttpRequest[] = [];
  const result = await fetchGonkagateModels(
    createFakeInstallDependencies({
      http: {
        request: async (request) => {
          requests.push(request);
          return {
            status: 200,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              data: [{ id: "qwen/qwen3-235b-a22b-instruct-2507-fp8" }],
            }),
          };
        },
      },
    }),
    "gp-client-secret",
  );

  assert.equal(result.ok, true);
  assert.equal(requests[0]?.method, "GET");
  assert.equal(requests[0]?.url, "https://api.gonkagate.com/v1/models");
  assert.equal(requests[0]?.headers?.Authorization, "Bearer gp-client-secret");
  assert.equal(requests[0]?.timeoutMs, 10_000);
});

test("GonkaGate models client returns redacted typed errors", async () => {
  const nonOk = await fetchGonkagateModels(
    createFakeInstallDependencies({
      http: {
        request: async () => ({
          status: 401,
          headers: {},
          body: '{"error":"gp-body-secret"}',
        }),
      },
    }),
    "gp-client-secret",
  );
  const network = await fetchGonkagateModels(
    createFakeInstallDependencies({
      http: {
        request: async () => {
          throw new Error("Authorization: Bearer gp-network-secret");
        },
      },
    }),
    "gp-client-secret",
  );

  assert.equal(nonOk.ok, false);
  assert.equal(network.ok, false);

  if (!nonOk.ok && !network.ok) {
    assert.equal(nonOk.error.code, "validated_models_unavailable");
    assert.equal(network.error.code, "validated_models_unavailable");
    assert.doesNotMatch(nonOk.error.message, /gp-body-secret/);
    assert.doesNotMatch(network.error.message, /gp-network-secret/);
    assert.match(network.error.message, /Bearer \[REDACTED\]/);
  }
});

test("GonkaGate models client rejects invalid, oversized, and malformed responses", async () => {
  const invalidJson = await fetchGonkagateModels(
    createFakeInstallDependencies({
      http: {
        request: async () => ({ status: 200, headers: {}, body: "not json" }),
      },
    }),
    "gp-client-secret",
  );
  const invalidSchema = await fetchGonkagateModels(
    createFakeInstallDependencies({
      http: {
        request: async () => ({
          status: 200,
          headers: {},
          body: JSON.stringify({ data: [{ id: "" }] }),
        }),
      },
    }),
    "gp-client-secret",
  );
  const empty = await fetchGonkagateModels(
    createFakeInstallDependencies({
      http: {
        request: async () => ({
          status: 200,
          headers: {},
          body: JSON.stringify({ data: [] }),
        }),
      },
    }),
    "gp-client-secret",
  );
  const oversized = await fetchGonkagateModels(
    createFakeInstallDependencies({
      http: {
        request: async () => ({
          status: 200,
          headers: {},
          body: "x".repeat(1024 * 1024 + 1),
        }),
      },
    }),
    "gp-client-secret",
  );

  assert.equal(invalidJson.ok, false);
  assert.equal(invalidSchema.ok, false);
  assert.equal(empty.ok, false);
  assert.equal(oversized.ok, false);
});

test("models response parser extracts ids and ignores extra object fields", () => {
  assert.deepEqual(
    extractModelsFromModelsResponse(
      JSON.stringify({
        data: [
          { id: "model-a", name: "Model A", owned_by: "gonkagate" },
          { id: "model-a", name: "Duplicate Model A" },
        ],
      }),
    ),
    [{ id: "model-a", name: "Model A" }],
  );
});
