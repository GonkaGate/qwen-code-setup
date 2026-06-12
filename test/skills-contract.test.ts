import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMatchesAll,
  assertMirroredSkillDirectory,
  readText,
} from "./contract-helpers.js";

const mirroredSkillDirectories = [
  "qwen-code-compatibility-audit",
  "code-simplification",
  "coding-prompt-normalizer",
  "node-security-review",
  "planning-and-task-breakdown",
  "spec-first-brainstorming",
  "technical-design-review",
  "typescript-coder",
  "typescript-coder-plan-spec",
  "typescript-error-modeling-and-boundaries",
  "typescript-node-esm-compiler-runtime",
  "typescript-public-api-design",
  "typescript-refactoring-and-simplification-patterns",
  "typescript-runtime-boundary-modeling",
  "typescript-systematic-debugging",
  "typescript-type-safety-review",
  "verification-before-completion",
] as const;

test("mirrored skill assets stay aligned across .agents and .claude", () => {
  for (const skillDirectory of mirroredSkillDirectories) {
    assertMirroredSkillDirectory(skillDirectory);
  }
});

test("AGENTS documents the mirrored skill pack", () => {
  const agents = readText("AGENTS.md");

  assertMatchesAll(agents, [
    /\.agents\/skills\//,
    /\.claude\/skills\//,
    /Mirrored skill pack/i,
  ]);
});

test("Qwen-specific compatibility skill replaces OpenCode-specific audit skill", () => {
  const qwenAudit = readText(
    ".agents/skills/qwen-code-compatibility-audit/SKILL.md",
  );

  assertMatchesAll(qwenAudit, [
    /qwen-code-compatibility-audit/,
    /Qwen Code/,
    /@qwen-code\/qwen-code/,
    /modelProviders\.openai/,
    /security\.auth\.selectedType/,
    /envKey/,
    /qwen auth/,
    /\/doctor/,
  ]);
  assert.doesNotMatch(qwenAudit, /opencode-ai/);
  assert.doesNotMatch(qwenAudit, /opencode debug config/);
});

test("universal skill pack includes expected high-value workflows", () => {
  const specFirst = readText(
    ".agents/skills/spec-first-brainstorming/SKILL.md",
  );
  const planning = readText(
    ".agents/skills/planning-and-task-breakdown/SKILL.md",
  );
  const typeScriptCoder = readText(".agents/skills/typescript-coder/SKILL.md");
  const verification = readText(
    ".agents/skills/verification-before-completion/SKILL.md",
  );

  assert.match(specFirst, /Spec-First Brainstorming/);
  assert.match(planning, /Planning and Task Breakdown/);
  assert.match(typeScriptCoder, /TypeScript/);
  assert.match(verification, /verification-before-completion/i);
});
