# Troubleshooting

## Why Did Setup Fail?

The CLI reports a blocker or error code, layer, and next action. JSON mode uses
the same stable codes without printing secrets.

## Can I Use `qwen auth status` Verification?

No. In the audited Qwen Code baseline, `qwen auth` has been removed. The
installer verifies locally inspectable Qwen settings and current-session
shadowing instead.

## Common Blockers

- `qwen_not_found`: install `@qwen-code/qwen-code` and ensure `qwen` is on
  `PATH`.
- `qwen_version_unparseable`: check that `qwen --version` prints a semantic
  version, then rerun setup.
- `settings_parse_failed`: fix malformed Qwen settings JSON/JSONC.
- `managed_write_failed`: inspect filesystem permissions and backup/rollback
  paths.
- `model_conflict`: remove or rename an unmanaged provider entry with the same
  model id.
- `validated_models_unavailable`: retry after GonkaGate `/v1/models` is
  reachable and returns at least one model with a string `id`.
- `secret_missing`: provide `GONKAGATE_API_KEY`, `--api-key-stdin`, or run
  interactively for the hidden prompt.
- `secret_shadowed_by_process_env`: unset or align the current shell
  `GONKAGATE_API_KEY`.
- `secret_shadowed_by_project_env`: remove or align trusted project `.qwen/.env`
  or `.env`.
- `project_modelproviders_override`: remove project `modelProviders` or use
  user scope.
- `system_settings_override`: remove conflicting system Qwen settings or verify
  the override manually.
- `verification_incomplete`: inspect the reported path and rerun after fixing
  local evidence.
- `live_verify_failed`: rerun without `--verify-live` or inspect Qwen/GonkaGate
  network availability.
