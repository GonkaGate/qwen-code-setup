# Qwen Code Compatibility Audit

## Verdict

`CONCERNS`

The user-scope installer contract remains viable for `@qwen-code/qwen-code`
`0.18.0`. Project scope is activation-only: the installer writes no project
providers or secrets, and it blocks when trusted project `modelProviders` would
hide user-level managed providers. The audited source marks `modelProviders`
with `replace` merge semantics, so a project-level `modelProviders` object can
hide user-level managed providers.

This repository may claim the runtime is shipped only for the bounded contract
that has real writes, backups, rollback, and local verification proof.

## Audited Baseline

- date: 2026-06-12
- package: `@qwen-code/qwen-code`
- npm version: `0.18.0`
- git tag: `v0.18.0`
- tag commit: `a7b8a3655c73c14dde99ab7138a566885e31c68f`
- package engine: `>=22.0.0`
- package binary: `qwen`

## Evidence

- npm metadata: `npm view @qwen-code/qwen-code@0.18.0 version engines bin`
- npm package tarball: `@qwen-code/qwen-code@0.18.0`
- source tag: `QwenLM/qwen-code` `v0.18.0`
- official Qwen Code authentication docs
- official Qwen Code model-provider docs
- official Qwen Code settings docs
- disposable local smoke:
  `QWEN_HOME=<disposable> npx -y @qwen-code/qwen-code@0.18.0 --version`
- disposable local smoke:
  `QWEN_HOME=<disposable> npx -y @qwen-code/qwen-code@0.18.0 auth status`
- disposable local smoke:
  `QWEN_HOME=<disposable> npx -y @qwen-code/qwen-code@0.18.0 --help`

No GonkaGate API key, raw `.env`, raw settings secret, bearer header, or live
GonkaGate/Qwen chat verification was used.

## Compatibility Findings

- `qwen` is still the package binary.
- Qwen Code package engine is `>=22.0.0`; this installer keeps
  `>=22.14.0`.
- User settings resolve through `~/.qwen/settings.json`, or
  `<QWEN_HOME>/settings.json` when `QWEN_HOME` is set.
- Workspace settings resolve through `.qwen/settings.json`.
- System settings resolve through `/etc/qwen-code/settings.json`,
  `/Library/Application Support/QwenCode/settings.json`,
  `C:\ProgramData\qwen-code\settings.json`, or
  `QWEN_CODE_SYSTEM_SETTINGS_PATH`.
- Qwen Code also has `QWEN_CODE_SYSTEM_DEFAULTS_PATH`; verifier design must
  account for it as a locally inspectable lower-precedence system-defaults
  layer.
- `modelProviders.openai[]` remains the OpenAI-compatible provider catalog
  surface.
- Provider entries use `id`, optional `name`, optional `description`,
  `baseUrl`, `envKey`, and optional `generationConfig`.
- `security.auth.selectedType = "openai"` remains the auth-selection setting.
- `model.name` remains the active model setting and must match a provider id
  for managed registry selection.
- Qwen Code resolves provider credentials from `process.env[envKey]`.
  `settings.env` is loaded into `process.env` only as the lowest-priority
  fallback.
- Qwen Code env precedence is CLI flags, existing `process.env`, the first
  selected `.env` file, then `settings.env`.
- Untrusted workspace settings and project `.env` files are ignored by the
  merged config/environment loader.
- `modelProviders` is marked with `replace` merge semantics in the settings
  schema.
- Duplicate model ids with the same `baseUrl` are not supported; the first
  registered config wins. The registry should avoid duplicate ids.
- `qwen auth` is still present as a removed command. Local smoke reports that
  auth configuration is interactive through `/auth` and status belongs to
  `/doctor`.
- `qwen --help` exposes no audited non-secret resolved-config or debug-config
  command suitable as the default success gate.

## Implementation Implications

- User-scope writes target the active Qwen user settings path.
- The v1 durable secret target remains user-level
  `settings.env.GONKAGATE_API_KEY`, with current-session shadowing warnings for
  higher-priority env sources.
- Project-scope writes must not write `modelProviders` or secrets into
  repository files. Activation-only project writes block when project
  `modelProviders` would hide the user catalog.
- Verification must inspect system defaults, user, trusted workspace, system
  settings, `QWEN_HOME`, `QWEN_CODE_SYSTEM_SETTINGS_PATH`, selected `.env`, and
  current `process.env`.
- Default setup success cannot depend on `/doctor` or a live model call.
