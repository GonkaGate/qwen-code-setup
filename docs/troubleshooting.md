# Troubleshooting

## Why did setup fail?

The CLI reports a blocker code, layer, and next action. JSON mode uses the same
stable codes without printing secrets.

## Can I use `qwen auth status` for verification?

No. In the audited Qwen Code baseline, `qwen auth` is removed. The command
itself points users toward interactive `/doctor`.

The installer verifies locally inspectable Qwen settings and current-session
shadowing instead.

## Why not copy the OpenCode installer directly?

OpenCode and Qwen Code have different config and secret semantics.

OpenCode supports a provider secret binding under its config. Qwen Code's
audited contract uses `envKey` and environment loading. For v1 this installer
stores the durable key in user-level `settings.env.GONKAGATE_API_KEY` and keeps
project files secret-free. Copying OpenCode's runtime would create false safety
claims.

## Common Blockers

- `qwen_not_found`: install `@qwen-code/qwen-code` and ensure `qwen` is on
  `PATH`.
- `qwen_version_unsupported`: use the audited Qwen Code version or rerun the
  compatibility audit before changing runtime assumptions.
- `settings_parse_failed`: fix malformed Qwen settings JSON/JSONC.
- `managed_write_failed`: inspect filesystem permissions and backup/rollback
  paths.
- `model_conflict`: remove or rename an unmanaged provider entry with the same
  model id.
- `validated_models_unavailable`: retry after GonkaGate `/v1/models` is
  reachable and returns valid JSON.
- `required_models_unavailable`: use a key with access to all three required
  GonkaGate models.
- `secret_missing`: provide `GONKAGATE_API_KEY`, `--api-key-stdin`, or run
  interactively for a hidden prompt.
- `secret_shadowed_by_process_env`: unset or align the current shell
  `GONKAGATE_API_KEY`.
- `secret_shadowed_by_project_env`: remove or align trusted project
  `.qwen/.env` or `.env`.
- `project_modelproviders_override`: remove project `modelProviders` or use
  user scope.
- `system_settings_override`: inspect system Qwen settings that override managed
  user/project state.
- `verification_incomplete`: make higher-precedence evidence readable and
  verify permissions.
- `live_verify_failed`: local setup is separate; inspect live Qwen/GonkaGate
  connectivity manually.

`--verify-live` is optional, can spend quota, and is not part of default setup
success.
