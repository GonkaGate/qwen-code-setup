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

Qwen Code provider entries refer to `envKey`.

For v1, the durable secret target is user-level
`settings.env.GONKAGATE_API_KEY` inside the active Qwen settings file:

- `~/.qwen/settings.json`, or
- `<QWEN_HOME>/settings.json` when Qwen Code is configured to use `QWEN_HOME`

The secret must never be written to project `.qwen/settings.json`, project
`.env`, or shell profiles.

## Model Discovery Request

After collecting the key, the installer must make authenticated
`GET https://api.gonkagate.com/v1/models` and use that live response as the
user-visible model catalog.

Security rules for the request:

- pass the key only through the `Authorization: Bearer ...` header
- never print the raw header key
- do not include the raw response in user-facing errors
- report invalid, empty, or unavailable live model catalogs through redacted
  diagnostics such as `validated_models_unavailable`

## Diagnostics

Do not print raw config or environment dumps that contain substituted secrets.
If verification output may contain secrets, capture it internally and render
only a redacted summary.
