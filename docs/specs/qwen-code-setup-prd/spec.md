# Qwen Code Setup PRD

## Status

Product contract for the first real `@gonkagate/qwen-code-setup` installer.

Repository status:

- scaffold, package, docs, tests, CI, mirrored skills, and installer runtime are
  implemented
- this PRD records the current runtime contract and release-readiness criteria

Runtime setup claims require every acceptance criterion in this PRD to stay
satisfied and `npm run ci` to remain green.

## Product Goal

Let a user run:

```bash
npx @gonkagate/qwen-code-setup
```

and end with plain `qwen` configured to use GonkaGate through Qwen Code's
OpenAI-compatible provider support.

The user should not need to:

- hand-edit `~/.qwen/settings.json`
- understand Qwen Code `modelProviders`
- manually export API keys through shell profiles
- store secrets in a repository
- know which GonkaGate models are currently available and supported for Qwen
  Code

## User Outcomes

### Primary User

A developer already using Qwen Code wants to route Qwen Code traffic through
GonkaGate with the least possible setup work.

Expected outcome:

- `qwen` runs with `security.auth.selectedType = "openai"`
- the active `model.name` is a supported GonkaGate model
- Qwen Code can resolve `GONKAGATE_API_KEY`
- Qwen Code can switch among all three currently supported GonkaGate models
- GonkaGate settings are durable across terminal sessions
- unrelated Qwen Code settings are preserved

### Automation User

A developer or CI job wants non-interactive setup.

Expected outcome:

- no prompt is required when `--yes`, `--scope`, and safe secret input are
  present
- machine-readable result is available through `--json`
- failures identify the blocking layer without printing secrets

## Public Flow

Interactive happy path:

1. user runs `npx @gonkagate/qwen-code-setup`
2. installer detects local `qwen`
3. installer verifies the Qwen Code version and audited config semantics
4. installer asks for setup scope
5. installer collects the GonkaGate API key through a hidden prompt
6. installer calls GonkaGate `/v1/models` with that key
7. installer verifies that all three required GonkaGate models are available
8. installer shows the supported GonkaGate model picker
9. installer writes managed Qwen Code user settings with all three models in
   the provider catalog
10. if project scope is selected, installer writes only project activation
    settings
11. installer verifies the durable and current-session effective outcome for
    the keys it owns
12. installer ends with a short success message and tells the user to run
    `qwen`

Non-interactive happy path:

```bash
GONKAGATE_API_KEY=gp-... npx @gonkagate/qwen-code-setup --scope user --yes
```

or:

```bash
printf '%s' "$GONKAGATE_API_KEY" |
  npx @gonkagate/qwen-code-setup --api-key-stdin --scope project --yes --json
```

## Fixed Product Invariants

- npm package: `@gonkagate/qwen-code-setup`
- public entrypoint: `npx @gonkagate/qwen-code-setup`
- binary aliases:
  - `gonkagate-qwen-code`
  - `qwen-code-setup`
- Qwen Code package: `@qwen-code/qwen-code`
- Qwen Code binary: `qwen`
- GonkaGate base URL: `https://api.gonkagate.com/v1`
- Qwen Code auth type: `openai`
- Qwen Code provider surface: `modelProviders.openai[]`
- Qwen Code auth selection: `security.auth.selectedType = "openai"`
- Qwen Code active model selection: `model.name`
- Qwen Code API-key lookup key: `GONKAGATE_API_KEY`
- transport target: OpenAI-compatible chat completions
- v1 supports all three current GonkaGate models
- v1 fetches GonkaGate models through a separate authenticated `/v1/models`
  request after API-key collection and before rendering the picker
- v1 writes every supported GonkaGate model into `modelProviders.openai[]`
- v1 does not expose arbitrary custom base URLs
- v1 does not expose arbitrary custom model ids
- v1 does not mutate shell profiles
- v1 does not store secrets in repository-local files
- v1 does not depend on `qwen auth`
- no plain `--api-key` flag may exist

## Audited Qwen Code Baseline

Audited on June 12, 2026:

- npm package `@qwen-code/qwen-code`
- stable version `0.18.0`
- source tag `v0.18.0`
- source tag commit `a7b8a3655c73c14dde99ab7138a566885e31c68f`
- package binary `qwen`
- Qwen Code package engine `>=22.0.0`
- this installer engine `>=22.14.0`

Primary evidence:

- official Qwen Code auth docs:
  `https://qwenlm.github.io/qwen-code-docs/en/users/configuration/auth/`
- official Qwen Code model-provider docs:
  `https://qwenlm.github.io/qwen-code-docs/en/users/configuration/model-providers/`
- source audit for `QwenLM/qwen-code` tag `v0.18.0`
- local `npx -y @qwen-code/qwen-code@0.18.0 auth status` smoke, which reports
  that `qwen auth` has been removed and points status checks to `/doctor`
- local `npx -y @qwen-code/qwen-code@0.18.0 --help` smoke, which exposes no
  audited non-secret resolved-config command suitable as the default setup
  success gate

Before implementation, rerun the compatibility audit. If upstream changed the
settings schema, env loading, auth command behavior, or provider selection,
update this PRD first.

## Qwen Code Config Model

The installer must use Qwen Code's documented OpenAI-compatible provider path.

Managed user settings target:

- default: `~/.qwen/settings.json`
- when `QWEN_HOME` is active: `<QWEN_HOME>/settings.json`

Locally inspectable system settings targets:

- macOS: `/Library/Application Support/QwenCode/settings.json`
- Windows: `C:\ProgramData\qwen-code\settings.json`
- Linux: `/etc/qwen-code/settings.json`
- override: `QWEN_CODE_SYSTEM_SETTINGS_PATH`
- system defaults override: `QWEN_CODE_SYSTEM_DEFAULTS_PATH`

Workspace settings are Qwen Code project settings discovered by Qwen Code. The
runtime implementation must verify the exact current path from Qwen Code source
before writing project scope. The expected project path is `.qwen/settings.json`
under the selected project root.

Qwen Code merges settings in this order:

1. system defaults
2. user settings
3. trusted workspace settings
4. system settings

Single values are last-wins. Untrusted workspace settings must not be treated as
effective project blockers.

`modelProviders` is a high-risk key. In the audited `0.18.0` source, schema
metadata marks `modelProviders` with `REPLACE`. The runtime must include
executable compatibility tests proving the actual behavior for the supported
Qwen Code baseline before claiming project scope support, and project scope must
block if project `modelProviders` would hide the user-managed provider catalog.

## Managed Qwen Settings

The installer must represent GonkaGate through Qwen Code's `openai` auth type.
It must not invent a separate Qwen provider family.

The installer must not rely only on a static model registry. After collecting a
safe API key, it must call:

```http
GET https://api.gonkagate.com/v1/models
Authorization: Bearer gp-...
```

This is a separate model-discovery request. It must run before model selection
and before managed writes.

The v1 required GonkaGate models are:

- `qwen/qwen3-235b-a22b-instruct-2507-fp8`
- `moonshotai/Kimi-K2.6`
- `minimaxai/minimax-m2.7`

If the authenticated `/v1/models` response does not include all three required
ids, setup must block with `required_models_unavailable`. It must not silently
write a partial catalog. If GonkaGate returns additional models, v1 must ignore
them until the curated registry and validation docs are explicitly updated.

User-level managed settings must include all required models:

```json
{
  "modelProviders": {
    "openai": [
      {
        "id": "qwen/qwen3-235b-a22b-instruct-2507-fp8",
        "name": "Qwen3 235B A22B Instruct FP8 via GonkaGate",
        "baseUrl": "https://api.gonkagate.com/v1",
        "description": "Managed by @gonkagate/qwen-code-setup",
        "envKey": "GONKAGATE_API_KEY"
      },
      {
        "id": "moonshotai/Kimi-K2.6",
        "name": "Kimi K2.6 via GonkaGate",
        "baseUrl": "https://api.gonkagate.com/v1",
        "description": "Managed by @gonkagate/qwen-code-setup",
        "envKey": "GONKAGATE_API_KEY"
      },
      {
        "id": "minimaxai/minimax-m2.7",
        "name": "MiniMax M2.7 via GonkaGate",
        "baseUrl": "https://api.gonkagate.com/v1",
        "description": "Managed by @gonkagate/qwen-code-setup",
        "envKey": "GONKAGATE_API_KEY"
      }
    ]
  },
  "security": {
    "auth": {
      "selectedType": "openai"
    }
  },
  "model": {
    "name": "qwen/qwen3-235b-a22b-instruct-2507-fp8"
  },
  "env": {
    "GONKAGATE_API_KEY": "gp-..."
  }
}
```

The actual `modelProviders.openai[]` catalog must include all three required
GonkaGate models, not only the selected default. The selected model controls
`model.name`.

Installer-owned entries are identified by all of:

- `baseUrl = "https://api.gonkagate.com/v1"`
- `envKey = "GONKAGATE_API_KEY"`
- `description` containing `Managed by @gonkagate/qwen-code-setup`

If a same-id `modelProviders.openai[]` entry exists with a different `baseUrl`
or `envKey`, the installer must block instead of overwriting it silently.

## Secret Policy

Qwen Code does not expose an audited OpenCode-style `{file:...}` provider secret
binding in the current baseline. Qwen Code provider entries resolve the key
through `envKey`.

For v1, the durable secret target is:

```text
settings.env.GONKAGATE_API_KEY
```

inside the active user Qwen settings file:

- `~/.qwen/settings.json`, or
- `<QWEN_HOME>/settings.json` when Qwen Code is configured to use `QWEN_HOME`

Reasoning:

- Qwen Code always treats `settings.env` as a fallback environment source.
- A separate user `.env` can be skipped when a trusted project `.env` exists.
- Shell profile mutation is out of scope.
- A wrapper command would not satisfy the "return to plain `qwen`" goal.

Security requirements:

- never print the raw `gp-...` key
- never accept `--api-key`
- accept only hidden prompt, `GONKAGATE_API_KEY`, or `--api-key-stdin`
- keep the secret out of repository-local files
- redact `env.GONKAGATE_API_KEY` in all diagnostics
- create backups before replacing Qwen user settings
- enforce owner-only permissions on managed user settings and backup files where
  POSIX modes are supported
- on native Windows, keep managed user files inside the current user's profile
  or the active Qwen user directory and rely on per-user ACLs

If upstream Qwen Code later adds a safe file-backed secret binding, that should
be handled as an explicit migration, not an undocumented v1 behavior change.

## Env Precedence And Current-Session Rules

Qwen Code environment precedence in the audited baseline:

1. CLI flags
2. current `process.env`
3. one selected `.env` file
4. `settings.env`
5. defaults

Only one `.env` file is loaded. In a trusted workspace, Qwen Code prefers
project `.qwen/.env` and then project `.env` before user-level env files. This
means user-level `.qwen/.env` is not reliable enough as the only durable secret
store.

The installer must account for shadowing:

- if current `process.env.GONKAGATE_API_KEY` exists and differs from the
  collected key, current-session verification must block or report that the
  current shell shadows the managed durable key
- if a trusted project `.qwen/.env` or `.env` defines `GONKAGATE_API_KEY`, the
  project-scope check must report that it shadows user `settings.env`
- if Qwen CLI flags such as `--openai-api-key`, `--openai-base-url`,
  `--auth-type`, or `--model` are used by the user after setup, they are outside
  durable install control and should be documented as runtime overrides

The installer itself must not pass secrets through plain Qwen CLI flags.

## Scope Behavior

### User Scope

User scope is the default outside a git repository and the safest first-class
scope.

User scope writes:

- managed `modelProviders.openai[]` entries
- `security.auth.selectedType = "openai"`
- `model.name = <selected curated model id>`
- `env.GONKAGATE_API_KEY`
- install state under `~/.gonkagate/qwen-code/install-state.json`

User scope must preserve unrelated Qwen settings.

### Project Scope

Project scope is allowed only after runtime compatibility tests prove actual
Qwen Code project settings precedence for the supported baseline.

Project scope writes:

- user settings:
  - managed `modelProviders.openai[]`
  - `env.GONKAGATE_API_KEY`
- project settings:
  - `security.auth.selectedType = "openai"`
  - `model.name = <selected curated model id>`

Project scope must not write:

- secrets
- `env.GONKAGATE_API_KEY`
- GonkaGate API keys
- secret file paths

to repository-local files.

If project settings define `modelProviders` and the audited effective behavior
would hide user-level managed providers, setup must block with an actionable
message. It must not insert the secret into project settings to force success.

Project settings backups must be stored under:

```text
~/.gonkagate/qwen-code/backups/project-settings
```

not beside repository files.

## Curated Model Policy

The public picker must show only models that are both:

- present in the local curated registry with `status: "validated"`
- present in the authenticated GonkaGate `/v1/models` response

The static registry defines what the installer knows how to support. The
authenticated `/v1/models` response proves what this API key can actually use
at setup time.

The registry must store:

- stable key
- GonkaGate model id
- display label
- validation status
- recommended default marker
- Qwen Code compatibility notes
- optional Qwen generation config fragments
- validation evidence date

The v1 supported model set is exactly:

- `qwen/qwen3-235b-a22b-instruct-2507-fp8`
- `moonshotai/Kimi-K2.6`
- `minimaxai/minimax-m2.7`

All three must be written into Qwen Code's managed `modelProviders.openai[]`
catalog. One model may be selected as the setup default through `model.name`,
but model support is not limited to that default.

Runtime `/v1/models` discovery is not a replacement for the curated registry;
it is an authenticated availability check after API-key intake.

## CLI Contract

Supported commands/options:

- `npx @gonkagate/qwen-code-setup`
- `--scope user|project`
- `--model <curated-model-key>`
- `--yes`
- `--json`
- `--api-key-stdin`
- `--dry-run`
- `--verify-live`

Forbidden:

- `--api-key`
- arbitrary `--base-url`
- arbitrary `--model-id`

Interactive behavior:

- show curated picker even when the validated list is small
- hide API-key input
- explain whether setup is user or project scoped
- display only redacted paths and blocker summaries

Non-interactive behavior:

- require `--scope` or `--yes`
- require a safe secret source unless a valid managed key already exists and the
  user explicitly allows reuse through `--yes`
- if multiple validated models exist, require `--model` or use the recommended
  default only with `--yes`
- `--json` output must not contain raw secrets

`--dry-run` must show planned writes and blockers without writing files.

`--verify-live` may run a real Qwen Code/GonkaGate smoke test. It is not part of
the default setup success criteria because it can spend quota and depend on
network/provider availability.

## Managed File Policy

Managed files:

- active Qwen user settings file
- project `.qwen/settings.json` only for project activation
- `~/.gonkagate/qwen-code/install-state.json`
- backups under `~/.gonkagate/qwen-code/backups/`

Write requirements:

- parse JSON with comments/trailing commas if Qwen Code accepts JSONC for the
  target file; otherwise enforce the exact upstream format
- preserve formatting as much as practical
- create timestamped backups before replacing existing managed targets
- write atomically
- never rewrite unchanged files
- on rerun, repair managed permissions when content already matches
- preserve unrelated settings, providers, hooks, MCP config, telemetry, UI, and
  other Qwen Code fields

`install-state.json` must record:

- installer version
- audited Qwen Code version
- selected scope
- selected curated model key
- managed model ids written
- active Qwen user settings path
- project settings path when applicable
- last durable verification timestamp
- secret storage policy version

## Verification Contract

Because Qwen Code does not currently expose a documented non-secret
`debug config` command equivalent, v1 verification must be explicit about what
it proves.

### Durable Verification

Durable verification must prove, from locally inspectable files and audited
Qwen Code merge rules, that:

- active Qwen user settings contain all managed GonkaGate model entries
- the last authenticated `/v1/models` check confirmed all three required model
  ids before writes
- `env.GONKAGATE_API_KEY` exists in user settings
- selected scope activation points at the intended curated model
- `security.auth.selectedType` resolves to `openai`
- `model.name` resolves to the selected GonkaGate model
- no locally inspectable higher-precedence settings layer disables or hides the
  managed GonkaGate entries
- file permissions meet the platform policy

If a locally inspectable system or workspace layer cannot be read, the verifier
must fail closed or report an inferred blocker. It must not claim exact success
from incomplete evidence.

### Current-Session Verification

Current-session verification must additionally account for:

- current process environment
- selected `.env` file for the current working directory
- `QWEN_HOME`
- `QWEN_CODE_SYSTEM_SETTINGS_PATH`
- trusted workspace status when it affects env/settings loading

If current-session env would shadow durable `settings.env`, setup may still mark
durable setup complete, but final output must clearly report that the current
shell/project will not use the managed key until the shadowing value is removed
or aligned.

### Live Verification

Live verification is optional behind `--verify-live`.

Minimum live smoke:

- run Qwen Code non-interactively with the selected model
- avoid printing prompts or secrets in logs
- use a tiny deterministic prompt
- redact request/response diagnostics
- treat provider/network failures separately from local config failures

Live verification failure must not corrupt managed files.

## Error And Diagnostics Requirements

Every user-facing failure must include:

- concise problem summary
- affected layer or file path when safe
- redacted blocker key
- recommended next action

Never print:

- raw `gp-...` key
- full `settings.env` with secret values
- raw `.env` contents
- raw Qwen output if it may contain secrets

Important blocker classes:

- `qwen_not_found`
- `qwen_version_unsupported`
- `settings_parse_failed`
- `managed_write_failed`
- `model_conflict`
- `validated_models_unavailable`
- `required_models_unavailable`
- `secret_missing`
- `secret_shadowed_by_process_env`
- `secret_shadowed_by_project_env`
- `project_modelproviders_override`
- `system_settings_override`
- `verification_incomplete`
- `live_verify_failed`

## Platform Requirements

v1 supports:

- macOS
- Linux
- native Windows
- WSL-based usage

Native Windows support means paths, backups, process spawning, and permission
behavior must be tested on Windows CI. POSIX mode enforcement applies only where
supported.

## Documentation Requirements

Runtime implementation must update:

- `AGENTS.md`
- `README.md`
- `docs/how-it-works.md`
- `docs/security.md`
- `docs/model-validation.md`
- `docs/troubleshooting.md`
- `CHANGELOG.md`
- tests under `test/`

Docs must stay explicit that Qwen Code is configured through
`modelProviders.openai[]` and `envKey`, not through an OpenCode-style
`provider.gonkagate` config object.

## Non-Goals

- arbitrary custom provider setup
- arbitrary custom model id setup
- arbitrary custom base URL setup
- shell profile mutation
- repository-local secret storage
- writing secrets to project `.qwen/settings.json`
- depending on `qwen auth`
- treating interactive `/doctor` as the only proof of success
- default live model calls during setup
- modifying Qwen Code OAuth flows

## Acceptance Criteria

The first runtime implementation is complete only when:

- `qwen` detection and version classification are implemented
- Qwen Code config/merge/env behavior is covered by tests against the audited
  baseline assumptions
- safe secret intake is implemented
- user-scope managed writes are implemented with backups and rollback safety
- project-scope behavior is implemented or explicitly disabled in CLI/docs
- installer fetches GonkaGate `/v1/models` after API-key intake and before the
  model picker
- curated model picker exposes all three required Qwen-supported GonkaGate
  models when the authenticated response confirms availability
- managed provider catalog writes all three required GonkaGate models
- duplicate model/provider conflicts block safely
- durable verification is implemented
- current-session shadowing diagnostics are implemented
- all secret-bearing diagnostics are redacted
- docs and contract tests reflect shipped behavior
- `npm run ci` passes on local and CI targets
