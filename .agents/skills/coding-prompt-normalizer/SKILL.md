---
name: coding-prompt-normalizer
description: "Turn rough, mixed-language, speech-to-text-like, repetitive, or partially specified coding requests into a high-signal task context brief and handoff prompt for agents working inside qwen-code-setup. Use when the hard part is reconstructing what the user wants, preserving exact signals, deduplicating messy notes, grounding repo assumptions, or making a downstream LLM understand the task correctly."
---

# Coding Prompt Normalizer

## Purpose

Turn noisy user task descriptions into context-rich handoff prompts for
`qwen-code-setup`.

The deliverable is an accurate task context model plus a paste-ready prompt for
the next agent. Prompt polish is secondary to preserving intent, constraints,
exact literals, and repository truth.

## Repository Truth

Be honest about this repo:

- it is the scaffold for `npx @gonkagate/qwen-code-setup`
- the Qwen Code installer runtime is not implemented yet
- the main contract surfaces are `AGENTS.md`, `README.md`, `docs/`,
  `src/cli.ts`, `src/constants/`, and `test/`
- the product source of truth is
  `docs/specs/qwen-code-setup-prd/spec.md`
- current audited Qwen Code baseline is `@qwen-code/qwen-code` `0.17.1` as of
  June 12, 2026, but upstream must be rechecked for config/auth work

Do not turn a request into a fake implementation brief for runtime behavior
that does not exist unless the user explicitly asks to build it.

## Workflow

1. Normalize the raw request.
   - Remove filler and duplicated fragments.
   - Preserve exact file paths, commands, env vars, model ids, and config keys.
   - Keep uncertainty explicit when a literal is unclear.
2. Infer the task mode:
   `implementation`, `bug-investigation`, `review-read-only`, `refactor`,
   `planning-spec`, `architecture-analysis`, `docs-and-messaging`, or
   `tooling-prompting`.
3. Select only task-relevant repo context.
   - Use `AGENTS.md` first.
   - Use the PRD for product or installer behavior.
   - Use `qwen-code-compatibility-audit` when the request depends on current
     Qwen Code config, auth, provider, or verification behavior.
4. Compose a dense handoff prompt.
   - Default to English for repo-facing prompts.
   - Preserve exact user constraints such as `read-only`, `planning only`,
     `do not edit files`, `stop here`, or `do not pretend the runtime exists`.
5. Run a final quality gate.
   - No hallucinated files.
   - No invented product decisions.
   - No raw secrets.
   - Clear assumptions and open questions.

## Literal Preservation

Preserve these literals exactly when present:

- `qwen-code-setup`
- `npx @gonkagate/qwen-code-setup`
- `@qwen-code/qwen-code`
- `qwen`
- `~/.qwen/settings.json`
- `modelProviders.openai[]`
- `security.auth.selectedType`
- `model.name`
- `envKey`
- `GONKAGATE_API_KEY`
- `--api-key-stdin`
- `docs/specs/qwen-code-setup-prd/spec.md`

## Readiness Rules

Emit implementation handoffs only when the requested change is specific enough
to execute and does not hide unresolved product decisions.

Default to planning or audit handoffs when the request touches:

- Qwen Code upstream config behavior
- secret storage
- project scope
- provider precedence
- effective verification
- curated model validation
- public npm or CLI contract
