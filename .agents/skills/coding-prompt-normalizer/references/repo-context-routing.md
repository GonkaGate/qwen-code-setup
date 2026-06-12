# Repo Context Routing

Use only the context that changes execution.

## Product Or Installer Behavior

Read:

- `AGENTS.md`
- `docs/specs/qwen-code-setup-prd/spec.md`
- relevant docs under `docs/`

Mention that the runtime is not implemented unless the task explicitly builds
it.

## Qwen Code Compatibility

Use `qwen-code-compatibility-audit` when the request depends on:

- Qwen Code config files or precedence
- `modelProviders.openai[]`
- `security.auth.selectedType`
- `model.name`
- `envKey`
- auth status or `/doctor`
- effective-config verification

## Code Implementation

Read:

- `src/cli.ts`
- `src/constants/`
- relevant tests under `test/`

For future runtime work, expect new modules under `src/install/`, but do not
pretend those files already exist.
