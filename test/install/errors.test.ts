import assert from "node:assert/strict";
import test from "node:test";
import {
  INSTALL_BLOCKER_CODES,
  PRD_INSTALL_BLOCKER_CODES,
  createBlocker,
} from "../../src/install/contracts/blockers.js";
import { InstallerError, toInstallerError } from "../../src/install/errors.js";

test("PRD blocker codes are stable typed values", () => {
  assert.deepEqual(PRD_INSTALL_BLOCKER_CODES, [
    "qwen_not_found",
    "qwen_version_unparseable",
    "settings_parse_failed",
    "managed_write_failed",
    "model_conflict",
    "validated_models_unavailable",
    "secret_missing",
    "secret_shadowed_by_process_env",
    "secret_shadowed_by_project_env",
    "project_modelproviders_override",
    "system_settings_override",
    "verification_incomplete",
    "live_verify_failed",
  ]);
  assert.ok(INSTALL_BLOCKER_CODES.includes("runtime_not_implemented"));
});

test("blockers and installer errors preserve stable codes and causes", () => {
  const blocker = createBlocker({
    code: "validated_models_unavailable",
    layer: "models",
    message: "Model catalog unavailable.",
  });
  const cause = new Error("low-level");
  const error = new InstallerError("managed_write_failed", "write failed", {
    cause,
  });

  assert.equal(blocker.code, "validated_models_unavailable");
  assert.equal(error.code, "managed_write_failed");
  assert.equal(error.cause, cause);
  assert.equal(toInstallerError(error), error);
  assert.equal(toInstallerError("boom").code, "unexpected_error");
});
