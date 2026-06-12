import assert from "node:assert/strict";
import test from "node:test";
import {
  redactSecrets,
  redactUnknown,
  redactedJsonStringify,
} from "../../src/install/redact.js";

test("redaction masks GonkaGate keys and bearer headers", () => {
  const input =
    "failed with gp-secret-value and Authorization: Bearer gp-another-secret";
  const redacted = redactSecrets(input);

  assert.doesNotMatch(redacted, /gp-secret-value/);
  assert.doesNotMatch(redacted, /gp-another-secret/);
  assert.match(redacted, /gp-\*\*\*/);
  assert.match(redacted, /Bearer \[REDACTED\]/);
});

test("redaction masks settings env and dotenv-style secrets", () => {
  const input = [
    '"GONKAGATE_API_KEY": "gp-json-secret"',
    "GONKAGATE_API_KEY=gp-dotenv-secret",
    "env.GONKAGATE_API_KEY=gp-diagnostic-secret",
  ].join("\n");
  const redacted = redactSecrets(input);

  assert.doesNotMatch(redacted, /gp-json-secret/);
  assert.doesNotMatch(redacted, /gp-dotenv-secret/);
  assert.doesNotMatch(redacted, /gp-diagnostic-secret/);
  assert.match(redacted, /GONKAGATE_API_KEY/);
  assert.match(redacted, /\[REDACTED\]/);
});

test("redacted JSON serialization does not expose secret-bearing values", () => {
  const output = redactedJsonStringify({
    settings: {
      env: {
        GONKAGATE_API_KEY: "gp-json-secret",
      },
    },
    stderr: "Authorization: Bearer gp-header-secret",
  });

  assert.doesNotMatch(output, /gp-json-secret/);
  assert.doesNotMatch(output, /gp-header-secret/);
  assert.match(output, /Bearer \[REDACTED\]/);
});

test("redactUnknown safely handles errors and process output strings", () => {
  assert.equal(redactUnknown(new Error("bad gp-error-secret")), "bad gp-***");
  assert.equal(redactUnknown("stdout gp-output-secret"), "stdout gp-***");
});
