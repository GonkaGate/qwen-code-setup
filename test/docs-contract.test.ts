import test from "node:test";
import { PRD_INSTALL_BLOCKER_CODES } from "../src/install/contracts/blockers.js";
import { assertMatchesAll, readText } from "./contract-helpers.js";

test("README states the intended package and honest shipped runtime status", () => {
  const readme = readText("README.md");

  assertMatchesAll(readme, [
    /@gonkagate\/qwen-code-setup/,
    /npx @gonkagate\/qwen-code-setup/,
    /runtime is implemented/i,
    /managed Qwen Code settings/i,
    /Qwen Code/i,
    /modelProviders\.openai\[\]/,
    /\/v1\/models/,
    /security\.auth\.selectedType = "openai"/,
    /model\.name/,
    /settings\.env\.GONKAGATE_API_KEY/,
    /GONKAGATE_API_KEY/,
    /--api-key-stdin/,
  ]);
});

test("AGENTS captures current repository truth and validation command", () => {
  const agents = readText("AGENTS.md");

  assertMatchesAll(agents, [
    /qwen-code-setup/,
    /@gonkagate\/qwen-code-setup/,
    /Qwen Code installer runtime is implemented/,
    /@qwen-code\/qwen-code`\s+`0\.18\.0/,
    /settings\.env\.GONKAGATE_API_KEY/,
    /modelProviders` is currently marked with `replace` merge semantics/,
    /\.agents\/skills\//,
    /\.claude\/skills\//,
    /npm run ci/,
  ]);
});

test("product spec preserves Qwen-specific runtime contract", () => {
  const spec = readText("docs/specs/qwen-code-setup-prd/spec.md");

  assertMatchesAll(spec, [
    /Product contract for the first real/,
    /settings\.env\.GONKAGATE_API_KEY/,
    /GET https:\/\/api\.gonkagate\.com\/v1\/models/,
    /Project Scope/,
    /Durable Verification/,
    /Current-Session Verification/,
    /--verify-live/,
    /modelProviders\.openai\[\]/,
    /security\.auth\.selectedType = "openai"/,
    /envKey/,
    /`qwen auth` has been removed/,
    /all three required GonkaGate models/,
    /required_models_unavailable/,
    /stable version `0\.18\.0`/,
    /QWEN_CODE_SYSTEM_DEFAULTS_PATH/,
    /project `modelProviders` would hide/,
  ]);
});

test("compatibility audit notes record current Qwen drift and implications", () => {
  const audit = readText("docs/qwen-compatibility-audit.md");

  assertMatchesAll(audit, [
    /^`CONCERNS`/m,
    /@qwen-code\/qwen-code`\s+`0\.18\.0`/,
    /tag commit: `a7b8a3655c73c14dde99ab7138a566885e31c68f`/,
    /modelProviders`.*`replace` merge semantics/,
    /settings\.env` is loaded into `process\.env` only as the lowest-priority/,
    /No GonkaGate API key, raw `\.env`, raw settings secret, bearer header/,
    /Project-scope writes must not write `modelProviders` or secrets into\s+repository files/,
  ]);
});

test("security docs forbid unsafe secret paths", () => {
  const security = readText("docs/security.md");

  assertMatchesAll(security, [
    /never print the GonkaGate `gp-\.\.\.` key/,
    /never accept secrets through a plain `--api-key` flag/,
    /never store the secret in repository-local files/,
    /GONKAGATE_API_KEY/,
    /--api-key-stdin/,
    /Qwen Code Secret Storage/,
    /settings\.env\.GONKAGATE_API_KEY/,
  ]);
});

test("model validation docs require authenticated availability for all supported models", () => {
  const modelValidation = readText("docs/model-validation.md");

  assertMatchesAll(modelValidation, [
    /all three GonkaGate models currently available/,
    /https:\/\/api\.gonkagate\.com\/v1\/models/,
    /required_models_unavailable/,
    /modelProviders\.openai\[\]/,
    /qwen\/qwen3-235b-a22b-instruct-2507-fp8/,
    /moonshotai\/Kimi-K2\.6/,
    /minimaxai\/minimax-m2\.7/,
    /recommended default/,
    /Unsupported curated model keys/,
  ]);
});

test("troubleshooting docs cover every stable PRD blocker code", () => {
  const troubleshooting = readText("docs/troubleshooting.md");

  for (const code of PRD_INSTALL_BLOCKER_CODES) {
    assertMatchesAll(troubleshooting, [new RegExp(`\`${code}\``)]);
  }
});
