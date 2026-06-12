# Security

## Current State

The runtime implements the secret and managed-file policy described here. Tests
cover safe secret intake, redaction, backups, rollback, dry-run, durable
verification, current-session shadowing, and fake live verification.

## Secret Rules

The installer must:

- never print the GonkaGate `gp-...` key
- never accept secrets through a plain `--api-key` flag
- never store the secret in repository-local files
- redact secret-bearing diagnostics and thrown errors
- preserve unrelated Qwen Code settings
- create backups before replacing managed user files

Allowed secret inputs:

- hidden interactive prompt
- `GONKAGATE_API_KEY`
- `--api-key-stdin`

## Qwen Code Secret Storage

Qwen Code provider entries refer to an `envKey`. For v1, the durable secret
target is user-level `settings.env.GONKAGATE_API_KEY` inside the active Qwen
settings file:

- `~/.qwen/settings.json`, or
- `<QWEN_HOME>/settings.json` when Qwen Code is configured to use `QWEN_HOME`

The installer uses this target because Qwen Code always treats `settings.env`
as a fallback environment source, while a separate user `.env` can be skipped
when a trusted project `.env` exists.

The secret must never be written to project `.qwen/settings.json`, project
`.env`, or shell profiles.

## Model Discovery Request

After collecting the key, the installer must make an authenticated
`GET https://api.gonkagate.com/v1/models` request to confirm the three supported
models are available.

Security rules for this request:

- pass the key only through an `Authorization: Bearer ...` header
- never print the header or raw key
- do not include the raw response in user-facing errors
- report missing model ids through redacted diagnostics such as
  `required_models_unavailable`

## Diagnostics

Do not print raw config or environment dumps if they can contain substituted
secrets.

If a verification command exposes secret-bearing output, capture it internally
only and render a redacted summary.

## Backups And Rollback

Existing managed targets are backed up under
`~/.gonkagate/qwen-code/backups/` before replacement. Project settings backups
also stay under that user-level backup root. Failed writes or failed durable
verification roll back prior managed writes where the filesystem permits it.
