# Implementation Plan: Production Qwen Code Setup

## Overview

This plan brings `@gonkagate/qwen-code-setup` from its current scaffold state to
a production-quality installer comparable to
`/Users/daniil/Projects/Opensource/opencode-setup`, while preserving Qwen
Code-specific behavior instead of copying OpenCode config semantics. The target
runtime lets a user run `npx @gonkagate/qwen-code-setup`, safely collect or
reuse a GonkaGate API key, confirm the required GonkaGate model catalog through
`GET https://api.gonkagate.com/v1/models`, write managed Qwen Code settings,
verify the locally inspectable effective outcome, and return the user to plain
`qwen`.

Default success must not depend on a live Qwen/GonkaGate chat session. Live
smoke is an explicit opt-in behind `--verify-live`.

This file is a draft implementation ledger until a human review confirms it is
complete enough to execute. Do not start runtime implementation from this file
until the Implementation Start Gate below is satisfied.

## Architecture / Quality Bar

The quality bar is `opencode-setup`, adapted for Qwen Code:

- Keep the public CLI thin. Split parsing, execution, and rendering into
  typed modules, with one human and JSON result contract.
- Put runtime work behind dependency injection for filesystem, prompts, stdin,
  clock, environment, HTTP, process execution, and platform facts.
- Prefer pure helpers for model registry checks, Qwen settings mutation, path
  resolution, redaction, blocker construction, and verification policy.
- Use a phased install flow: resolve context, detect Qwen, resolve scope/model,
  intake secret, discover models, plan writes, apply writes transactionally,
  verify durable state, persist install state, then verify current-session
  shadowing.
- Use declarative ownership plans for managed config keys. Qwen owns
  `modelProviders.openai[]` entries identified by managed fields,
  `security.auth.selectedType`, `model.name`, and user-level
  `settings.env.GONKAGATE_API_KEY`; it does not own arbitrary Qwen settings.
- Create backups before replacing existing managed files, write atomically,
  avoid rewriting unchanged files, and record rollback actions for partial
  failures.
- Treat verification as a success gate. Because Qwen Code has no audited
  non-secret `debug config` equivalent, verification must be bounded to
  locally inspectable settings, env, shadowing, and audited merge evidence.
- Test with fake `qwen`, fake HTTP, temp homes, fake projects, Windows path
  behavior, POSIX permissions, rollback failures, reruns, and JSON output.

## Repository Truth To Preserve

- The npm package is `@gonkagate/qwen-code-setup`.
- The intended public entrypoint is `npx @gonkagate/qwen-code-setup`.
- Binary aliases are `gonkagate-qwen-code` and `qwen-code-setup`.
- The target Qwen package is `@qwen-code/qwen-code`; the target binary is
  `qwen`.
- The stable GonkaGate provider identity is `gonkagate`.
- The canonical base URL is `https://api.gonkagate.com/v1`.
- The current transport target is OpenAI-compatible chat completions.
- The Qwen Code auth type is `openai`.
- Qwen provider entries live under `modelProviders.openai[]`.
- Auth selection is `security.auth.selectedType = "openai"`.
- Active model selection is `model.name`.
- Provider key lookup uses `envKey = "GONKAGATE_API_KEY"`.
- The durable v1 secret target is user-level
  `settings.env.GONKAGATE_API_KEY`.
- The user settings target is `~/.qwen/settings.json` or
  `<QWEN_HOME>/settings.json`.
- The expected project settings target is `.qwen/settings.json`, but the exact
  current Qwen source must be verified before project writes are implemented.
- System settings targets include `/etc/qwen-code/settings.json`,
  `/Library/Application Support/QwenCode/settings.json`,
  `C:\ProgramData\qwen-code\settings.json`, and
  `QWEN_CODE_SYSTEM_SETTINGS_PATH`.
- Do not write secrets to project `.qwen/settings.json`, project `.env`, or
  shell profiles.
- Do not mutate shell profiles at all.
- Do not accept a plain `--api-key` flag.
- Do not expose arbitrary custom base URLs or arbitrary custom model ids in v1.
- Safe secret inputs are hidden interactive prompt, `GONKAGATE_API_KEY`, and
  `--api-key-stdin`.
- After API-key intake, make a separate authenticated
  `GET https://api.gonkagate.com/v1/models` request before picker rendering or
  managed writes.
- Support exactly the current required GonkaGate model ids:
  `qwen/qwen3-235b-a22b-instruct-2507-fp8`, `moonshotai/Kimi-K2.6`, and
  `minimaxai/minimax-m2.7`.
- If `/v1/models` does not return all three required ids, block with
  `required_models_unavailable`.
- Write all three supported models into `modelProviders.openai[]`; `model.name`
  selects only the setup default.
- Ignore extra GonkaGate models until the curated registry and docs are
  explicitly updated.
- Account for Qwen Code env precedence: CLI flags, `process.env`, one selected
  `.env`, `settings.env`, defaults.
- Trusted project `.qwen/.env` or `.env` may shadow user
  `settings.env.GONKAGATE_API_KEY`.
- Project scope writes activation settings only; it must not write
  `env.GONKAGATE_API_KEY` or secrets to project files.
- `qwen auth` is removed in the audited `@qwen-code/qwen-code@0.18.0`
  baseline; do not depend on it.
- `/doctor` is interactive and must not be the only success gate.
- Live Qwen/GonkaGate smoke belongs behind explicit `--verify-live`, not
  default setup success.

## Implementation Start Gate

- [ ] A human has reviewed this `tasks.md` and confirmed the phase order,
      dependencies, and scope.
- [ ] Every task remains unchecked before implementation starts.
- [ ] Every task has description, acceptance criteria, verification,
      dependencies, likely files, and estimated scope.
- [ ] No task requires default live GonkaGate/Qwen chat verification.
- [ ] Any future implementation session starts by re-reading `AGENTS.md`, this
      `tasks.md`, and the Qwen compatibility audit outcome from Task 1.1.

## Codex Goal Execution Model

Use Codex Goals for this ledger only after the Implementation Start Gate is
satisfied. A Goal should cover one bounded pack below, not the whole repository
in one open-ended objective. Each Goal must name a verifiable end state,
constraints, proof commands, and blocker handling before it starts.

### Goal operating rules

- [ ] Start exactly one active Goal at a time.
- [ ] Keep the Goal scoped to one pack unless the user explicitly expands it.
- [ ] Use this format:
      `/goal Complete Goal Pack <N>: <name> from tasks.md without stopping until <verifiable end state>.`
- [ ] Before editing in a Goal turn, re-read `AGENTS.md`, this `tasks.md`, and
      the current files named by the active pack.
- [ ] Preserve all RTK rules: every shell command goes through `rtk`.
- [ ] Do not mark a Goal complete because a budget is reached, a partial slice
      passed, or the remaining work looks small.
- [ ] Do not run live GonkaGate/Qwen chat verification unless the active Goal or
      the user explicitly authorizes `--verify-live`.
- [ ] If the active pack hits upstream drift, unavailable evidence, unsafe
      secret exposure risk, or repeated verification failure, stop with a
      concrete blocker and the smallest reopen target.

### Goal progress protocol

- [ ] At the start of each Goal, restate the active pack, task range,
      non-goals, and expected proof surface.
- [ ] As tasks complete, update only the corresponding task checkboxes and any
      concise evidence notes needed to make the ledger auditable.
- [ ] After every checkpoint in the active pack, run the checkpoint's proof
      commands and record the result in the final response or in ledger-owned
      evidence if the implementation session uses evidence notes.
- [ ] A pack is complete only when every task in the pack is checked, the pack
      checkpoint passes, and no blocker remains hidden in chat-only state.
- [ ] The final release Goal is complete only after the Final Readiness Gate is
      satisfied.

### Goal packs

#### Goal Pack 1: Contract and Runtime Skeleton

**Task range:** Tasks 1.1 through 2.3.

**Goal prompt:**

```text
/goal Complete Goal Pack 1: Contract and Runtime Skeleton from tasks.md without stopping until Tasks 1.1-2.3 are checked, the Contract baseline and Runtime skeleton checkpoints pass, and the repo still truthfully says the installer runtime is not shipped until real writes and verification exist.
```

**Completion evidence:**

- [x] Qwen compatibility audit result is reflected in docs/constants/tests.
- [x] CLI parse/execute/render contracts exist without enabling managed writes.
- [x] Error/result/redaction contracts are tested.
- [x] `rtk npm run test` passes.

#### Goal Pack 2: Qwen Detection, Secrets, and Model Discovery

**Task range:** Tasks 3.1 through 5.3.

**Goal prompt:**

```text
/goal Complete Goal Pack 2: Qwen Detection, Secrets, and Model Discovery from tasks.md without stopping until Tasks 3.1-5.3 are checked, Qwen paths and compatibility gates are proven, safe secret intake is tested, authenticated /v1/models discovery blocks missing required models, and no managed config write can occur before model availability succeeds.
```

**Completion evidence:**

- [x] Fake-`qwen`, path, project precedence, secret intake, and fake HTTP tests
      pass.
- [x] `required_models_unavailable` prevents picker rendering and writes.
- [x] No raw key, bearer header, raw `.env`, or raw settings secret appears in
      output or errors.
- [x] `rtk npm run test` passes.

#### Goal Pack 3: Managed Writes, Backup, Rollback, and Scope Ownership

**Task range:** Tasks 6.1 through 7.3.

**Goal prompt:**

```text
/goal Complete Goal Pack 3: Managed Writes, Backup, Rollback, and Scope Ownership from tasks.md without stopping until Tasks 6.1-7.3 are checked, user-scope writes are transactional and idempotent, project scope writes activation only, backups and rollback are proven, and dry-run shows planned changes without writing files.
```

**Completion evidence:**

- [x] Qwen settings parse/merge preserves unrelated settings and blocks
      conflicts.
- [x] User settings contain all three managed `modelProviders.openai[]` entries
      and user-level `settings.env.GONKAGATE_API_KEY`.
- [x] Project scope writes no secrets to repository-local files.
- [x] Backup, permission, rollback, rerun, and dry-run tests pass.
- [x] `rtk npm run test` passes.

#### Goal Pack 4: Verification and CLI Completion

**Task range:** Tasks 8.1 through 9.3.

**Goal prompt:**

```text
/goal Complete Goal Pack 4: Verification and CLI Completion from tasks.md without stopping until Tasks 8.1-9.3 are checked, durable and current-session verification are evidence-based, --verify-live is opt-in only, human and JSON CLI outputs are redacted, and reruns are idempotent.
```

**Completion evidence:**

- [x] Durable verification proves locally inspectable Qwen settings and fails
      closed on incomplete evidence.
- [x] Current-session verification reports process/env/project shadowing
      without leaking values.
- [x] `--verify-live` is fake-tested and never part of default success.
- [x] Human and JSON result contracts are stable and redacted.
- [x] `rtk npm run test` passes.

#### Goal Pack 5: Cross-platform, Docs, Package, and Release Readiness

**Task range:** Tasks 10.1 through 10.4 and the Final Readiness Gate.

**Goal prompt:**

```text
/goal Complete Goal Pack 5: Cross-platform, Docs, Package, and Release Readiness from tasks.md without stopping until Tasks 10.1-10.4 are checked, the Release candidate checkpoint passes, the Final Readiness Gate is satisfied, npm/package proof is green, and docs no longer claim scaffold-only status after the runtime flip.
```

**Completion evidence:**

- [x] Cross-platform tests cover Linux, native Windows, macOS expectations, and
      WSL behavior.
- [x] README, AGENTS, docs, CHANGELOG, and contract tests match shipped runtime
      truth.
- [x] `rtk npm run ci` passes.
- [x] `rtk npm pack --dry-run` includes only expected package files.
- [x] Any live `--verify-live` smoke remains optional and separately
      authorized.

## Phase 1: Contract and source-of-truth hardening

### Task 1.1: Re-audit current Qwen Code compatibility

**Description:** Re-run the Qwen Code compatibility audit before runtime writes
exist. Confirm the currently supported `@qwen-code/qwen-code` version, Node
engine, binary, settings paths, provider schema, env precedence, project trust
behavior, `modelProviders` merge/replace behavior, removal of `qwen auth`, and
whether any non-secret resolved-config command exists.

**Acceptance criteria:**

- [x] Audit evidence uses primary Qwen docs, Qwen source for the audited tag, npm
      metadata, and disposable local CLI smoke only.
- [x] The audit records a `PASS`, `CONCERNS`, or `FAIL` verdict with exact
      implementation implications.
- [x] Any drift from `AGENTS.md` or the PRD is reflected before implementation
      tasks proceed.

**Verification:**

- [x] Focused contract tests cover the audited Qwen baseline metadata.
- [x] Manual audit notes contain no API keys, raw `.env`, raw settings secrets,
      or bearer headers.
- [x] `rtk npm run test` passes after contract updates.

**Dependencies:** None.

**Files likely touched:**

- `AGENTS.md`
- `docs/specs/qwen-code-setup-prd/spec.md`
- `docs/architecture-decisions.md`
- `docs/how-it-works.md`
- `src/constants/contract.ts`
- `test/docs-contract.test.ts`
- `test/package-contract.test.ts`

**Estimated scope:** Medium.

### Task 1.2: Align public contract constants and documentation

**Description:** Normalize package, binary, Qwen, provider, base URL, supported
model count, and runtime status constants so docs and tests describe one
current truth. Keep `runtimeImplemented` false until the real installer and
readiness gate complete.

**Acceptance criteria:**

- [x] Both binary aliases are represented in contract metadata and package
      tests.
- [x] Docs keep the scaffold status truthful until the final runtime flip.
- [x] Fixed product invariants are defined once and reused by CLI/runtime
      tests.

**Verification:**

- [x] `rtk npm run typecheck` passes.
- [x] `rtk npm run test` passes.
- [x] `rtk npm run format:check` passes for touched docs/tests.

**Dependencies:** Task 1.1.

**Files likely touched:**

- `src/constants/contract.ts`
- `package.json`
- `README.md`
- `AGENTS.md`
- `docs/README.md`
- `test/package-contract.test.ts`
- `test/docs-contract.test.ts`

**Estimated scope:** Small.

### Task 1.3: Expand the curated model registry contract

**Description:** Make the static curated model registry expressive enough for
runtime selection and auditability. Add validation evidence date, Qwen
compatibility notes, recommended default, and optional generation config
fragments while keeping the v1 model set exactly three ids.

**Acceptance criteria:**

- [x] Registry records all three required ids with `status: "validated"`.
- [x] Exactly one recommended default is available for `--yes`.
- [x] Extra GonkaGate models are not surfaced without explicit registry and doc
      updates.
- [x] Unsupported model keys produce typed validation errors.

**Verification:**

- [x] Focused registry tests cover required ids, recommended default, validated
      filtering, and unsupported keys.
- [x] `rtk npm run test` passes.

**Dependencies:** Task 1.1.

**Files likely touched:**

- `src/constants/models.ts`
- `docs/model-validation.md`
- `test/package-contract.test.ts`
- `test/install/models.test.ts`

**Estimated scope:** Small.

## Checkpoint: Contract baseline

- [x] Tasks 1.1 through 1.3 are complete.
- [x] Contract, docs, and constants describe the same Qwen baseline.
- [x] `rtk npm run test` passes.
- [x] No implementation claims setup works yet.

## Phase 2: Runtime foundation and dependency injection

### Task 2.1: Split CLI parse, execute, and render layers

**Description:** Replace the placeholder CLI shape with an `opencode-setup`-style
CLI boundary: parse options, execute a typed install flow, and render human or
JSON output. Keep managed writes disabled until later phases provide the
runtime.

**Acceptance criteria:**

- [x] CLI supports `--scope user|project`, `--model <curated-model-key>`,
      `--yes`, `--json`, `--api-key-stdin`, `--dry-run`, and `--verify-live`.
- [x] CLI rejects `--api-key`, arbitrary `--base-url`, and arbitrary
      `--model-id` before any runtime work.
- [x] Parse errors, installer failures, blockers, and success results share one
      typed result model.

**Verification:**

- [x] CLI tests cover parse success, forbidden args, help/version, JSON mode,
      and stdout/stderr separation.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 1.2 and 1.3.

**Files likely touched:**

- `src/cli.ts`
- `src/cli/parse.ts`
- `src/cli/execute.ts`
- `src/cli/render.ts`
- `src/cli/contracts.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium.

### Task 2.2: Add install dependency interfaces and node adapters

**Description:** Introduce dependency-injected adapters for filesystem, stdin,
prompts, command execution, HTTP, clock, runtime environment, and platform
facts. Provide node-backed production adapters and test fakes.

**Acceptance criteria:**

- [x] Runtime code can be tested without touching the real home directory,
      network, or real `qwen` process.
- [x] Windows command resolution handles `PATHEXT`, `.cmd`, `.bat`, and hidden
      process windows.
- [x] Environment normalization accounts for case-insensitive Windows env keys.

**Verification:**

- [x] Unit tests cover node adapter edge cases with fakes.
- [x] Harness tests can create temp homes, temp projects, fake `qwen`, and fake
      HTTP responses.
- [x] `rtk npm run typecheck` passes.

**Dependencies:** Task 2.1.

**Files likely touched:**

- `src/install/deps.ts`
- `test/install/harness.ts`
- `test/install/test-deps.ts`
- `test/install/deps.test.ts`

**Estimated scope:** Medium.

### Task 2.3: Define installer errors, redaction, and result contracts

**Description:** Create typed installer errors, blocker codes, redacted
diagnostics, install result unions, and safe formatting helpers. The error model
must preserve actionable layers without leaking secrets.

**Acceptance criteria:**

- [x] All PRD blocker classes have stable typed codes.
- [x] Secret-bearing values are redacted in errors, JSON output, and unexpected
      exception rendering.
- [x] Error causes are preserved internally without printing raw secrets.

**Verification:**

- [x] Redaction tests cover `gp-...`, bearer headers, `settings.env`, raw
      `.env`, and process output strings.
- [x] Result contract tests cover success, failed, blocked, dry-run, and
      verification-warning cases.
- [x] `rtk npm run test` passes.

**Dependencies:** Task 2.1.

**Files likely touched:**

- `src/install/errors.ts`
- `src/install/redact.ts`
- `src/install/contracts/install-flow.ts`
- `src/install/contracts/blockers.ts`
- `src/cli/render.ts`
- `test/install/errors.test.ts`
- `test/install/redact.test.ts`

**Estimated scope:** Medium.

## Checkpoint: Runtime skeleton

- [x] Tasks 2.1 through 2.3 are complete.
- [x] CLI has production-shaped parse/render contracts.
- [x] No managed writes are enabled yet.
- [x] `rtk npm run test` passes.

## Phase 3: Qwen Code detection and path/config resolution

### Task 3.1: Detect `qwen` and validate supported Qwen versions

**Description:** Implement Qwen command detection and version classification
through the DI command runner. Do not depend on `qwen auth`; use only audited
safe smoke commands and version/source evidence.

**Acceptance criteria:**

- [x] Missing `qwen` fails with `qwen_not_found`.
- [x] Unparseable Qwen version output fails with `qwen_version_unparseable`.
- [x] The detector records package, binary, version, Node engine expectations,
      and audited config semantics.
- [x] Interactive `/doctor` is not treated as the success gate.

**Verification:**

- [x] Fake-`qwen` tests cover missing command, parseable version, unsupported
      version, unexpected output, and command failure.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 2.2 and 2.3.

**Files likely touched:**

- `src/install/qwen.ts`
- `src/install/context.ts`
- `src/install/errors.ts`
- `test/install/qwen.test.ts`
- `test/install/harness.ts`

**Estimated scope:** Medium.

### Task 3.2: Resolve Qwen user, project, system, and managed paths

**Description:** Implement cross-platform path resolution for Qwen settings and
GonkaGate installer-owned state. Account for `QWEN_HOME`,
`QWEN_CODE_SYSTEM_SETTINGS_PATH`, expected project `.qwen/settings.json`, system
settings paths, Windows user profiles, WSL, and POSIX path normalization.

**Acceptance criteria:**

- [x] User settings resolve to `~/.qwen/settings.json` or
      `<QWEN_HOME>/settings.json`.
- [x] Project settings resolve only after current Qwen source confirms the
      project path and trust semantics.
- [x] System settings include Linux, macOS, Windows, and env override paths.
- [x] Backups and install state stay under `~/.gonkagate/qwen-code/`.

**Verification:**

- [x] Path tests cover POSIX, macOS, native Windows, WSL, relative cwd, git root,
      `QWEN_HOME`, and system override cases.
- [x] `rtk npm run test` passes locally; Windows behavior is covered by
      platform-fact tests and remains a CI proof target.

**Dependencies:** Task 3.1.

**Files likely touched:**

- `src/install/paths.ts`
- `src/install/platform-path.ts`
- `src/install/context.ts`
- `test/install/paths.test.ts`
- `test/install/context.test.ts`

**Estimated scope:** Medium.

### Task 3.3: Prove `modelProviders` and project precedence behavior

**Description:** Add executable compatibility proof for Qwen `modelProviders`
merge/replace behavior, project settings precedence, trust behavior, and whether
project settings can hide user-managed providers. Project-scope implementation
must stay gated until this proof is green.

**Acceptance criteria:**

- [x] Tests or fixtures prove actual `modelProviders.openai[]` behavior for the
      supported Qwen baseline.
- [x] Project trust behavior is documented and represented in blockers.
- [x] If project `modelProviders` can hide user-managed entries, project setup
      blocks with `project_modelproviders_override`.

**Verification:**

- [x] Compatibility test harness runs against disposable `QWEN_HOME` and fake or
      pinned Qwen fixtures without real secrets.
- [x] Docs and tests record the proven behavior.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 1.1, 3.1, and 3.2.

**Files likely touched:**

- `src/install/qwen-compatibility.ts`
- `src/install/verify-layers.ts`
- `docs/how-it-works.md`
- `docs/specs/qwen-code-setup-prd/spec.md`
- `test/install/qwen-compatibility.test.ts`

**Estimated scope:** Medium.

## Checkpoint: Qwen detection and paths

- [x] Tasks 3.1 through 3.3 are complete.
- [x] Project-scope behavior is either proven or explicitly blocked.
- [x] `rtk npm run test` passes.
- [x] No secret or managed settings write has been enabled before path proof.

## Phase 4: Safe secret intake and managed storage

### Task 4.1: Implement safe secret intake

**Description:** Resolve the GonkaGate API key from `--api-key-stdin`,
`GONKAGATE_API_KEY`, or a hidden prompt. Reject unsafe CLI secret paths before
reading stdin, prompting, HTTP, or writes.

**Acceptance criteria:**

- [x] `--api-key-stdin` trims exactly one safe secret value and rejects empty
      input.
- [x] `GONKAGATE_API_KEY` is accepted without printing it.
- [x] Interactive prompt is hidden and unavailable in non-TTY automation.
- [x] Plain `--api-key` remains unsupported.

**Verification:**

- [x] Secret intake tests cover stdin, env, hidden prompt, non-TTY failure,
      empty input, precedence, and forbidden flag rejection.
- [x] Tests assert no raw key appears in stdout, stderr, JSON, or thrown error
      messages.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 2.1, 2.2, and 2.3.

**Files likely touched:**

- `src/install/secrets.ts`
- `src/install/deps.ts`
- `src/cli/parse.ts`
- `test/install/secrets.test.ts`
- `test/cli.test.ts`

**Estimated scope:** Small.

### Task 4.2: Model user-level `settings.env` secret storage

**Description:** Implement the pure mutation plan that writes the durable secret
to user-level Qwen settings under `env.GONKAGATE_API_KEY`. This task defines the
storage target and redaction behavior but does not yet perform final config
writes until Phase 6.

**Acceptance criteria:**

- [x] Secret storage target is only user settings `env.GONKAGATE_API_KEY`.
- [x] Project settings, project `.env`, and shell profiles are never storage
      targets.
- [x] Secret value is redacted from planned-write previews, errors, and JSON.
- [x] POSIX owner-only file policy and Windows profile-scoped policy are
      represented in the storage plan.

**Verification:**

- [x] Pure tests cover secret mutation output and redacted dry-run summaries.
- [x] Tests prove project-scope storage still targets user settings only.
- [x] `rtk npm run test` passes.

**Dependencies:** Task 4.1.

**Files likely touched:**

- `src/install/secret-storage.ts`
- `src/install/managed-config-mutations.ts`
- `src/install/managed-files.ts`
- `test/install/secret-storage.test.ts`

**Estimated scope:** Small.

### Task 4.3: Add secret provenance blocker types

**Description:** Add blocker construction for process env and project `.env`
shadowing so later verification can report when current-session Qwen will not
use the managed durable secret.

**Acceptance criteria:**

- [x] `secret_shadowed_by_process_env` is emitted when current
      `process.env.GONKAGATE_API_KEY` differs from the collected or managed key.
- [x] `secret_shadowed_by_project_env` is emitted when trusted project
      `.qwen/.env` or `.env` defines `GONKAGATE_API_KEY`.
- [x] Blockers identify safe file/layer names without printing raw env values.

**Verification:**

- [x] Blocker tests cover matching, mismatching, missing, and unreadable env
      evidence.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 3.2 and 4.2.

**Files likely touched:**

- `src/install/secret-provenance.ts`
- `src/install/verification-blockers.ts`
- `test/install/secret-provenance.test.ts`

**Estimated scope:** Small.

## Checkpoint: Secret safety

- [x] Tasks 4.1 through 4.3 are complete.
- [x] No supported secret source leaks in text, JSON, thrown errors, or logs.
- [x] Secret storage remains user-level only.
- [x] `rtk npm run test` passes.

## Phase 5: GonkaGate model discovery and supported catalog

### Task 5.1: Add authenticated GonkaGate `/v1/models` client

**Description:** Implement an injected HTTP client for
`GET https://api.gonkagate.com/v1/models` that runs after API-key intake and
before picker rendering or managed writes.

**Acceptance criteria:**

- [x] Request uses `Authorization: Bearer <secret>` only in the HTTP adapter.
- [x] Raw bearer headers and raw responses are never printed.
- [x] Network, auth, parse, and schema failures map to typed redacted errors.
- [x] The client has bounded response parsing and timeout behavior.

**Verification:**

- [x] Fake HTTP tests assert request URL, method, header placement, parse
      handling, redaction, timeout, and non-OK behavior.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 2.2, 2.3, and 4.1.

**Files likely touched:**

- `src/install/gonkagate-client.ts`
- `src/install/deps.ts`
- `src/install/errors.ts`
- `test/install/gonkagate-client.test.ts`

**Estimated scope:** Medium.

### Task 5.2: Enforce required model availability

**Description:** Intersect authenticated `/v1/models` results with the curated
registry. Block setup when any required model id is missing and ignore extra
returned ids until registry/docs explicitly change.

**Acceptance criteria:**

- [x] All three required ids must be present before picker rendering.
- [x] Missing required ids fail with `required_models_unavailable`.
- [x] Extra ids are ignored and do not appear in the picker or provider catalog.
- [x] No partial provider catalog can be written after model discovery failure.

**Verification:**

- [x] Tests cover all-present, one-missing, malformed response, duplicate ids,
      extra ids, and no-write-on-failure cases.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 1.3 and 5.1.

**Files likely touched:**

- `src/install/model-discovery.ts`
- `src/constants/models.ts`
- `src/install/errors.ts`
- `test/install/model-discovery.test.ts`

**Estimated scope:** Small.

### Task 5.3: Implement model selection and picker rules

**Description:** Resolve the setup default model from `--model`, interactive
picker, or `--yes` recommended default. The selected default controls
`model.name`; support remains all three provider entries.

**Acceptance criteria:**

- [x] Interactive mode shows the curated model picker.
- [x] `--yes` may select exactly the recommended validated default.
- [x] `--model` accepts curated model keys only.
- [x] Arbitrary model ids remain unsupported.
- [x] Picker runs only after authenticated availability succeeds.

**Verification:**

- [x] Selection tests cover interactive picker, `--yes`, explicit model key,
      invalid key, unavailable required models, and JSON result summaries.
- [x] `rtk npm run test` passes.

**Dependencies:** Task 5.2.

**Files likely touched:**

- `src/install/selection.ts`
- `src/install/deps.ts`
- `src/cli/parse.ts`
- `test/install/selection.test.ts`
- `test/cli.test.ts`

**Estimated scope:** Small.

## Checkpoint: Model discovery

- [x] Tasks 5.1 through 5.3 are complete.
- [x] Authenticated model discovery happens before picker and writes.
- [x] Partial catalogs are impossible when required models are unavailable.
- [x] `rtk npm run test` passes.

## Phase 6: Config parse/merge/write/backup implementation

### Task 6.1: Implement Qwen settings parse and mutation helpers

**Description:** Add pure helpers for reading, parsing, and mutating Qwen
settings while preserving unrelated keys. Use JSONC parsing only if the audited
Qwen target accepts JSONC; otherwise enforce the exact upstream format.

**Acceptance criteria:**

- [x] Parse failures return `settings_parse_failed` with safe path context.
- [x] Mutations preserve unrelated Qwen settings, MCP config, UI, telemetry,
      hooks, and unknown fields.
- [x] Managed provider entries are identified by id, base URL, env key, and
      managed description.
- [x] Same-id provider entries with different base URL or env key block with
      `model_conflict`.

**Verification:**

- [x] Pure config tests cover empty files, missing files, valid JSON, valid
      JSONC if supported, malformed input, unrelated fields, managed entries,
      unmanaged entries, and conflicts.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 1.1, 3.3, 4.2, and 5.2.

**Files likely touched:**

- `src/install/qwen-settings.ts`
- `src/install/jsonc.ts`
- `src/install/managed-config-mutations.ts`
- `src/install/managed-provider-config.ts`
- `test/install/config.test.ts`
- `test/install/managed-config-mutations.test.ts`

**Estimated scope:** Medium.

### Task 6.2: Write user-scope managed Qwen settings

**Description:** Implement user-scope writes for managed provider catalog,
`security.auth.selectedType`, selected `model.name`,
`env.GONKAGATE_API_KEY`, and install state. This is the first slice that can
complete user-scope setup after verification is wired.

**Acceptance criteria:**

- [x] User settings include all three managed `modelProviders.openai[]` entries.
- [x] `model.name` is the selected curated model id only.
- [x] `security.auth.selectedType` is `openai`.
- [x] `env.GONKAGATE_API_KEY` is written only in user settings.
- [x] Install state records installer version, audited Qwen version, scope,
      model key, managed ids, settings path, verification timestamp, and secret
      policy version.

**Verification:**

- [x] Temp-home integration tests verify created settings and install state.
- [x] Tests assert unchanged files are not rewritten on exact rerun.
- [x] `rtk npm run test` passes.

**Dependencies:** Task 6.1.

**Files likely touched:**

- `src/install/write-target-config.ts`
- `src/install/write.ts`
- `src/install/scope.ts`
- `src/install/state.ts`
- `test/install/write.test.ts`
- `test/install/state.test.ts`

**Estimated scope:** Medium.

### Task 6.3: Add atomic writes, backups, permissions, and rollback

**Description:** Implement managed file replacement with timestamped backups,
atomic writes, owner-only POSIX permissions, Windows profile scoping, rollback
actions, and partial-failure recovery.

**Acceptance criteria:**

- [x] Existing managed targets are backed up before replacement.
- [x] Writes are atomic and skip unchanged content.
- [x] POSIX managed dirs/files use owner-only permissions where supported.
- [x] Native Windows managed files stay under the active user's profile or
      active Qwen user directory.
- [x] Verification or later write failure triggers rollback of prior managed
      writes.

**Verification:**

- [x] Tests cover backup naming, unchanged skip, permissions, atomic write
      failure, backup failure, rollback success, rollback failure, and Windows
      path policy.
- [x] `rtk npm run test` passes.

**Dependencies:** Task 6.2.

**Files likely touched:**

- `src/install/managed-files.ts`
- `src/install/managed-write-transaction.ts`
- `src/install/rollback.ts`
- `src/install/write.ts`
- `test/install/managed-files.test.ts`
- `test/install/rollback.test.ts`

**Estimated scope:** Medium.

## Checkpoint: Managed user writes

- [x] Tasks 6.1 through 6.3 are complete.
- [x] User-scope managed settings can be written transactionally in tests.
- [x] Backups and rollback are proven.
- [x] `rtk npm run test` passes.

## Phase 7: Scope normalization and ownership

### Task 7.1: Implement user-scope ownership normalization

**Description:** Make reruns and prior managed state safe. Remove or replace
only installer-owned GonkaGate entries from old managed positions while
preserving unrelated user Qwen settings and unmanaged providers.

**Acceptance criteria:**

- [x] Reruns update managed entries without duplicating provider catalog items.
- [x] Previously selected managed model can be replaced without deleting
      unrelated `model.name` values unless the installer owns them.
- [x] Unmanaged provider entries and unrelated auth/model settings are
      preserved or reported as blockers when they prevent success.

**Verification:**

- [x] Rerun tests cover same model, changed model, previous installer state,
      conflicting unmanaged providers, and unrelated settings preservation.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 6.2 and 6.3.

**Files likely touched:**

- `src/install/scope.ts`
- `src/install/managed-config-mutations.ts`
- `src/install/state.ts`
- `test/install/rerun.test.ts`
- `test/install/scope.test.ts`

**Estimated scope:** Medium.

### Task 7.2: Implement gated project-scope activation writes

**Description:** Implement project scope only after Task 3.3 proves Qwen project
semantics. Project scope writes user-level providers and secret, then writes
project activation settings only. Project backups must live under the
user-level GonkaGate backup directory, not beside repository files.

**Acceptance criteria:**

- [x] Project settings write only `security.auth.selectedType` and
      `model.name`.
- [x] Project settings never contain `env.GONKAGATE_API_KEY`, raw keys, secret
      file paths, or provider secrets.
- [x] Project backups are stored under
      `~/.gonkagate/qwen-code/backups/project-settings`.
- [x] If project `modelProviders` would hide user-managed providers, setup
      blocks with `project_modelproviders_override`.

**Verification:**

- [x] Project-scope tests cover git root discovery, selected cwd, activation
      writes, no project secrets, backup location, project override blockers,
      and rollback.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 3.3, 6.3, and 7.1.

**Files likely touched:**

- `src/install/scope.ts`
- `src/install/paths.ts`
- `src/install/write-target-config.ts`
- `src/install/verify-layers.ts`
- `test/install/scope.test.ts`
- `test/install/write.test.ts`

**Estimated scope:** Medium.

### Task 7.3: Implement dry-run planning for user and project scopes

**Description:** Add `--dry-run` output that shows planned managed writes,
backup targets, blockers, and verification implications without writing files,
touching secrets, or modifying settings.

**Acceptance criteria:**

- [x] Dry-run never writes user settings, project settings, backups, or install
      state.
- [x] Dry-run output redacts the API key and any secret-bearing values.
- [x] Dry-run reports whether user/project scope would be blocked by conflicts,
      missing Qwen, missing models, or shadowing.
- [x] JSON dry-run output is stable and machine-readable.

**Verification:**

- [x] Dry-run tests assert no filesystem writes and stable human/JSON output.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 5.2, 6.2, and 7.2.

**Files likely touched:**

- `src/install/dry-run.ts`
- `src/install/index.ts`
- `src/cli/render.ts`
- `test/install/dry-run.test.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium.

## Checkpoint: Scope ownership

- [x] Tasks 7.1 through 7.3 are complete.
- [x] User and project scopes have explicit ownership rules.
- [x] Project scope writes no secrets to repository-local files.
- [x] `rtk npm run test` passes.

## Phase 8: Effective config and secret provenance verification

### Task 8.1: Implement durable verification from inspectable evidence

**Description:** Implement the bounded durable verifier for Qwen Code. It must
prove installer-owned user settings, selected activation, model catalog, last
authenticated model availability, permission policy, and absence of
locally-inspectable higher-precedence blockers.

**Acceptance criteria:**

- [x] Verifier proves all three managed providers exist in user settings.
- [x] Verifier proves `security.auth.selectedType = "openai"` and selected
      `model.name` resolve as intended for the selected scope.
- [x] Verifier proves `env.GONKAGATE_API_KEY` exists in user settings without
      exposing the value.
- [x] Unreadable or incomplete higher-precedence evidence fails closed with
      `verification_incomplete`.
- [x] System settings overrides can block with `system_settings_override`.

**Verification:**

- [x] Verification tests cover success, missing provider, missing secret,
      wrong auth type, wrong model, unreadable system settings, project override,
      and permission mismatch.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 3.3, 6.3, and 7.2.

**Files likely touched:**

- `src/install/verify-effective.ts`
- `src/install/verify-layers.ts`
- `src/install/effective-config-policy.ts`
- `src/install/verification-blockers.ts`
- `test/install/verify-effective.test.ts`
- `test/install/verify-layers.test.ts`

**Estimated scope:** Medium.

### Task 8.2: Implement current-session shadowing verification

**Description:** Add current-session verification for `process.env`, selected
`.env` files, `QWEN_HOME`, `QWEN_CODE_SYSTEM_SETTINGS_PATH`, trusted workspace
settings, and project env shadowing. Durable setup may succeed while current
session reports actionable shadowing.

**Acceptance criteria:**

- [x] Differing `process.env.GONKAGATE_API_KEY` reports
      `secret_shadowed_by_process_env`.
- [x] Trusted project `.qwen/.env` or `.env` reports
      `secret_shadowed_by_project_env` when it defines the key.
- [x] Qwen CLI flag overrides are documented as outside durable install control.
- [x] Current-session warnings are rendered without converting durable success
      into file rollback unless durable verification failed.

**Verification:**

- [x] Tests cover env precedence, selected `.env` resolution, trusted and
      untrusted project cases, `QWEN_HOME`, system override, and JSON warning
      rendering.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 4.3 and 8.1.

**Files likely touched:**

- `src/install/verify-current-session.ts`
- `src/install/secret-provenance.ts`
- `src/install/verify-layers.ts`
- `src/cli/render.ts`
- `test/install/verify-current-session.test.ts`

**Estimated scope:** Medium.

### Task 8.3: Add optional `--verify-live` smoke

**Description:** Implement explicit live verification behind `--verify-live`.
It may run a tiny deterministic Qwen/GonkaGate smoke only after durable
verification passes. It must not be part of default setup success or default CI.

**Acceptance criteria:**

- [x] Live smoke runs only when `--verify-live` is present.
- [x] Live smoke uses the selected model and avoids printing prompts, raw
      request/response bodies, or secrets.
- [x] Provider/network failures report `live_verify_failed` separately from
      local config failures.
- [x] Live verification failure does not corrupt managed files.

**Verification:**

- [x] Fake-`qwen` live tests cover success, provider failure, timeout, redaction,
      and no-default-live behavior.
- [x] Default `rtk npm run test` uses fakes only and does not call GonkaGate or
      real Qwen.

**Dependencies:** Tasks 8.1 and 8.2.

**Files likely touched:**

- `src/install/live-verify.ts`
- `src/install/index.ts`
- `src/cli/parse.ts`
- `src/cli/render.ts`
- `test/install/live-verify.test.ts`
- `test/cli.test.ts`

**Estimated scope:** Medium.

## Checkpoint: Verification gates

- [x] Tasks 8.1 through 8.3 are complete.
- [x] Default success is based on bounded local verification, not live chat.
- [x] `--verify-live` is opt-in and fake-tested.
- [x] `rtk npm run test` passes.

## Phase 9: CLI UX, JSON output, rerun behavior

### Task 9.1: Complete human CLI flow and messaging

**Description:** Wire the full interactive and non-interactive install flow:
scope selection, model selection, secret intake, model discovery, dry-run,
writes, verification, and final guidance. Keep output concise, actionable, and
redacted.

**Acceptance criteria:**

- [x] Interactive flow explains user vs project scope and shows the model
      picker after authenticated availability succeeds.
- [x] Non-interactive flow works with `--scope`, `--model` or `--yes`, and a
      safe secret source.
- [x] Success output tells the user to run plain `qwen`.
- [x] Failure output names the blocker layer/code and next action without
      printing secrets.

**Verification:**

- [x] CLI integration tests cover interactive fakes, non-interactive env,
      stdin, project scope, dry-run, and common blockers.
- [x] Snapshot or structural tests cover human output without overfitting
      volatile paths.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 5.3, 7.3, and 8.2.

**Files likely touched:**

- `src/install/index.ts`
- `src/install/session.ts`
- `src/cli/render.ts`
- `test/cli.test.ts`
- `test/install/install-flow.test.ts`

**Estimated scope:** Medium.

### Task 9.2: Stabilize JSON output contract

**Description:** Define and test the machine-readable output schema for success,
blocked, failed, dry-run, current-session warning, and live-verify outcomes.
JSON must be safe for automation and never include raw secrets.

**Acceptance criteria:**

- [x] JSON output contains stable `ok`, `status`, `scope`, `selectedModel`,
      `managedPaths`, `changed`, `blockers`, and `warnings` fields where
      applicable.
- [x] JSON errors use stable `errorCode` and redacted messages.
- [x] stdout/stderr separation is deterministic in JSON mode.
- [x] No raw key, bearer header, `.env` value, or full secret-bearing settings
      object can appear in JSON.

**Verification:**

- [x] JSON contract tests cover all installer result variants.
- [x] Redaction tests scan serialized JSON payloads.
- [x] `rtk npm run test` passes.

**Dependencies:** Task 9.1.

**Files likely touched:**

- `src/cli/contracts.ts`
- `src/cli/render.ts`
- `src/install/contracts/install-flow.ts`
- `test/cli.test.ts`
- `test/install/json-output.test.ts`

**Estimated scope:** Small.

### Task 9.3: Harden rerun and repair behavior

**Description:** Make repeated setup safe and predictable. Reruns should reuse
or replace only installer-owned values, repair managed permissions when content
matches, and avoid unnecessary writes.

**Acceptance criteria:**

- [x] Exact rerun is idempotent and reports no content changes.
- [x] Rerun with a new selected model updates `model.name` while preserving all
      provider catalog entries.
- [x] Rerun can reuse an existing managed key only in the documented
      non-interactive path.
- [x] Permission repair runs when managed content matches but file protections
      drifted.
- [x] Failed rerun rolls back changed managed files.

**Verification:**

- [x] Rerun tests cover exact rerun, changed model, changed scope, existing
      managed key reuse, permission repair, conflict, and rollback.
- [x] `rtk npm run test` passes.

**Dependencies:** Tasks 7.1, 8.1, and 9.2.

**Files likely touched:**

- `src/install/index.ts`
- `src/install/state.ts`
- `src/install/managed-files.ts`
- `src/install/scope.ts`
- `test/install/rerun.test.ts`

**Estimated scope:** Medium.

## Checkpoint: CLI completion

- [x] Tasks 9.1 through 9.3 are complete.
- [x] Human and JSON CLI behavior are stable and redacted.
- [x] Reruns are idempotent and rollback-safe.
- [x] `rtk npm run test` passes.

## Phase 10: Cross-platform proof, docs, CI, release readiness

### Task 10.1: Expand cross-platform and CI proof

**Description:** Ensure platform behavior is tested for Linux, native Windows,
macOS expectations, and WSL detection. Keep CI practical while preserving
explicit proof for path, process, backup, and permission behavior.

**Acceptance criteria:**

- [x] Ubuntu and Windows CI run the full default `npm run ci`.
- [x] macOS behavior is covered either by CI matrix or focused path/process
      tests with a documented reason if macOS CI is not added.
- [x] WSL path and platform classification is tested.
- [x] Native Windows path, `PATHEXT`, profile scoping, and no-POSIX-chmod policy
      are tested.

**Verification:**

- [x] `rtk npm run test` passes locally.
- [x] CI matrix passes on supported operating systems.
      GitHub Actions CI passed on both `test (ubuntu-latest)` and
      `test (windows-latest)` for the pushed `main` implementation.
- [x] Cross-platform tests do not require real secrets or live GonkaGate.

**Dependencies:** Tasks 2.2, 3.2, 6.3, and 8.2.

**Files likely touched:**

- `.github/workflows/ci.yml`
- `src/install/context.ts`
- `src/install/deps.ts`
- `src/install/platform-path.ts`
- `test/install/paths.test.ts`
- `test/install/deps.test.ts`

**Estimated scope:** Small.

### Task 10.2: Flip runtime truth and public docs

**Description:** Flip repository truth only after the installer is implemented
and verified. Update the primary public docs and contract metadata so they
describe shipped behavior rather than scaffold status.

**Acceptance criteria:**

- [x] `runtimeImplemented` becomes true only after implementation and proof are
      complete.
- [x] README, AGENTS, and docs index describe actual Qwen behavior, not OpenCode
      `provider.gonkagate` semantics.
- [x] Contract metadata and docs-contract tests fail if runtime truth, Qwen
      config targets, or model list drift.

**Verification:**

- [x] Docs-contract tests fail if runtime truth, Qwen config targets, or model
      list drift.
- [x] `rtk npm run test` passes.
- [x] `rtk npm run format:check` passes.

**Dependencies:** Tasks 9.3 and 10.1.

**Files likely touched:**

- `AGENTS.md`
- `README.md`
- `docs/README.md`
- `src/constants/contract.ts`
- `test/docs-contract.test.ts`
- `test/package-contract.test.ts`

**Estimated scope:** Medium.

### Task 10.3: Update security, model, and troubleshooting docs

**Description:** Update the detailed operational docs after runtime behavior is
implemented. Keep the docs explicit about Qwen `modelProviders.openai[]`,
user-level `settings.env.GONKAGATE_API_KEY`, env shadowing, backups, rollback,
redaction, blocker codes, and optional live verification.

**Acceptance criteria:**

- [x] Security docs document user-level `settings.env.GONKAGATE_API_KEY`,
      shadowing, backups, rollback, and redaction policy.
- [x] Model validation docs describe authenticated `/v1/models`, the exact
      three required ids, ignored extra models, and
      `required_models_unavailable`.
- [x] Troubleshooting documents every stable blocker code and the safe next
      action for each.
- [x] CHANGELOG records the runtime implementation meaningfully.

**Verification:**

- [x] Docs-contract tests cover security, model-validation, and blocker-code
      anchors.
- [x] `rtk npm run test` passes.
- [x] `rtk npm run format:check` passes.

**Dependencies:** Task 10.2.

**Files likely touched:**

- `CHANGELOG.md`
- `docs/how-it-works.md`
- `docs/security.md`
- `docs/model-validation.md`
- `docs/troubleshooting.md`
- `test/docs-contract.test.ts`

**Estimated scope:** Medium.

### Task 10.4: Complete package and release readiness checks

**Description:** Prove the package is ready to publish through typecheck,
tests, formatting, package validation, generated build output, and package
contents. Keep live verification separate from release readiness unless a human
explicitly opts in.

**Acceptance criteria:**

- [x] `prepack` remains `npm run ci`.
- [x] Package contents include `bin`, `dist`, docs, README, CHANGELOG, and
      license, and exclude tests and secret-bearing artifacts.
- [x] `publint` passes.
- [x] Release docs explain that `--verify-live` is optional and can spend quota.

**Verification:**

- [x] `rtk npm run ci` passes.
- [x] `rtk npm pack --dry-run` shows only expected package files.
- [x] Focused install-flow tests pass for user scope, project scope, dry-run,
      rollback, missing required models, env shadowing, JSON mode, and
      Windows-style paths.

**Dependencies:** Task 10.3.

**Files likely touched:**

- `package.json`
- `package-lock.json`
- `release-please-config.json`
- `.github/workflows/publish.yml`
- `docs/troubleshooting.md`
- `test/package-contract.test.ts`

**Estimated scope:** Small.

## Checkpoint: Release candidate

- [x] Tasks 10.1 through 10.4 are complete.
- [x] Public docs, package metadata, runtime constants, and tests agree.
- [x] `rtk npm run ci` passes.
- [x] `rtk npm pack --dry-run` includes only expected release files.

## Final Readiness Gate

Before the implementation is considered production-ready:

- [x] Run `rtk npm run ci`.
- [x] Run focused user-scope integration tests with fake `qwen`, fake HTTP,
      temp `QWEN_HOME`, and temp user settings.
- [x] Run focused project-scope integration tests proving activation-only
      project writes and no project secrets.
- [x] Run rollback tests for write failure, backup failure, verification
      failure, and live verification failure.
- [x] Run model-discovery tests proving missing required ids fail with
      `required_models_unavailable` and no partial writes.
- [x] Run current-session shadowing tests for `process.env`, trusted
      `.qwen/.env`, trusted `.env`, `QWEN_HOME`, and
      `QWEN_CODE_SYSTEM_SETTINGS_PATH`.
- [x] Run JSON-output tests and redaction scans over success, blocked, failed,
      dry-run, and live-verify results.
- [x] Run package proof with `rtk npm pack --dry-run`.
- [x] Confirm docs and `AGENTS.md` no longer claim scaffold-only status after
      the runtime flip.
- [x] Treat any live `--verify-live` GonkaGate/Qwen smoke as optional,
      explicitly authorized, quota-bearing, and separate from default setup
      success.
