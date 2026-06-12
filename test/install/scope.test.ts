import assert from "node:assert/strict";
import test from "node:test";
import { resolveInstallScope } from "../../src/install/scope.js";
import { createFakeInstallDependencies } from "./test-deps.js";

test("scope resolver respects explicit scope and --yes user default", async () => {
  const explicit = await resolveInstallScope(
    { scope: "project", yes: false },
    createFakeInstallDependencies(),
  );
  const yesDefault = await resolveInstallScope(
    { yes: true },
    createFakeInstallDependencies(),
  );

  assert.equal(explicit.ok, true);
  assert.equal(yesDefault.ok, true);
  if (explicit.ok && yesDefault.ok) {
    assert.equal(explicit.scope, "project");
    assert.equal(explicit.prompted, false);
    assert.equal(yesDefault.scope, "user");
    assert.equal(yesDefault.prompted, false);
  }
});

test("scope resolver prompts only in interactive mode", async () => {
  let prompts = 0;
  const interactive = await resolveInstallScope(
    { yes: false },
    createFakeInstallDependencies({
      stdin: { isTTY: true, readAll: async () => "" },
      prompts: {
        secret: async () => "gp-secret",
        select: async (_message, choices) => {
          prompts += 1;
          return choices[1];
        },
      },
    }),
  );
  const nonInteractive = await resolveInstallScope(
    { yes: false },
    createFakeInstallDependencies(),
  );

  assert.equal(interactive.ok, true);
  assert.equal(nonInteractive.ok, false);
  assert.equal(prompts, 1);
  if (interactive.ok && !nonInteractive.ok) {
    assert.equal(interactive.scope, "project");
    assert.equal(interactive.prompted, true);
    assert.equal(nonInteractive.blocker.layer, "scope");
  }
});
