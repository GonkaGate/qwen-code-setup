# How It Works

## Current State

The repository currently provides:

- npm package scaffold
- TypeScript CLI runtime
- docs and product contract
- mirrored skill pack
- CI and package validation
- contract tests
- pre-write Qwen detection, path resolution, and compatibility-gate helpers
- managed writes, backups, rollback, dry-run, durable verification, and
  current-session warnings

The current Qwen Code compatibility baseline is
`@qwen-code/qwen-code` `0.18.0`, audited on June 12, 2026 with a
`CONCERNS` verdict. The user-scope provider contract is viable, but project
scope must stay gated because Qwen Code currently marks `modelProviders` with
`replace` merge semantics. Newer Qwen Code versions are not blocked solely
because they are newer; actual setup and verification checks should surface
runtime incompatibilities.

## Intended Runtime Flow

The runtime:

1. Resolve the current platform and home directory.
2. Detect `qwen` on `PATH`.
3. Parse and record the local Qwen Code version.
4. Collect the GonkaGate API key through a safe input.
5. Fetch `https://api.gonkagate.com/v1/models` with that key.
6. Parse and dedupe the live GonkaGate model catalog.
7. Choose the setup default from the first fetched model or the live model
   picker.
8. Merges managed GonkaGate settings into Qwen Code user settings, including
   the fetched models in `modelProviders.openai[]`.
9. Persist the secret in user-level `settings.env.GONKAGATE_API_KEY`.
10. Verifies the durable Qwen Code outcome from locally inspectable evidence.
11. Reports current-session shadowing when process or project env overrides the
    managed durable key.
12. Prints a short success message that returns the user to `qwen`.

## Planned Qwen Code Settings

Qwen Code's audited baseline uses:

- `~/.qwen/settings.json`
- `<QWEN_HOME>/settings.json` when `QWEN_HOME` is active
- `modelProviders.openai[]`
- `security.auth.selectedType`
- `model.name`
- provider `envKey`
- `settings.env` as the lowest-priority env fallback

The installer should preserve unrelated settings and only own the GonkaGate
provider entries and activation settings it creates.

## Scope Behavior

The OpenCode installer has a clear user/project ownership split. Qwen Code
project-scope semantics still need implementation design.

The current pre-write compatibility gate treats trusted project
`modelProviders` as blocking evidence. Qwen Code `0.18.0` marks that key with
`replace` merge semantics, so project scope cannot claim support when project
settings would hide the user-level GonkaGate provider catalog.

## Verification

The final implementation needs a Qwen-specific equivalent to "resolved config
proves setup works" because Qwen Code does not currently expose an audited
non-secret `debug config` command.

The v1 verifier should prove the installer-owned keys through:

- locally inspectable settings files and audited merge rules
- current process env and selected `.env` shadowing checks
- `QWEN_HOME` and `QWEN_CODE_SYSTEM_SETTINGS_PATH` handling
- optional `--verify-live` headless smoke when the user explicitly asks for a
  real GonkaGate/Qwen call
