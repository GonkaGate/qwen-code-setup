# Architecture Decisions

## Decision 1: Ship Only A Narrow, Verifiable Installer

The repository now exposes a real installer runtime, but only for the bounded
Qwen Code contract that has local verification proof.

Reasoning:

- Qwen Code does not use the same provider config contract as OpenCode.
- User-scope managed writes, backups, rollback, dry-run, and local verification
  are implemented.
- Project scope is intentionally activation-only because Qwen Code marks
  `modelProviders` with replace merge semantics.
- Live Qwen/GonkaGate chat verification remains opt-in through `--verify-live`.

The installer must keep docs, tests, and package metadata aligned with this
bounded runtime truth instead of expanding into unaudited write targets.

## Decision 2: Use Qwen Code's OpenAI-Compatible Provider Surface

The current integration uses Qwen Code's `modelProviders.openai[]` surface, not
a GonkaGate-specific provider family invented by this installer.

The initial expected fields are:

- `id`
- `name`
- `baseUrl`
- `envKey`

Activation is expected through:

- `security.auth.selectedType = "openai"`
- `model.name = <curated GonkaGate model id>`

This decision was revalidated against `@qwen-code/qwen-code` `0.18.0` on
June 12, 2026. The provider surface remains valid, but `modelProviders` is
marked with `replace` merge semantics, so project-scope writes must stay gated
until later executable compatibility proof confirms they cannot hide
user-managed providers.

## Decision 3: Combine Curated Support With Authenticated Model Discovery

The setup flow should expose the three supported GonkaGate models, not an
arbitrary model id box, and it must confirm availability through GonkaGate after
API-key intake.

Reasons:

- predictable public UX
- support and troubleshooting clarity
- compatibility metadata can be attached to each model
- validation proof can gate end-user exposure
- the authenticated `/v1/models` response proves the supplied API key can
  actually use the required models

The v1 required model set is:

- `qwen/qwen3-235b-a22b-instruct-2507-fp8`
- `moonshotai/Kimi-K2.6`
- `minimaxai/minimax-m2.7`

All three must be written into `modelProviders.openai[]`; `model.name` only
selects the default.

## Decision 4: Use User Settings `env` For The Durable Secret

Qwen Code resolves provider credentials through `envKey`.

For v1, `@gonkagate/qwen-code-setup` stores the durable key in user-level
`settings.env.GONKAGATE_API_KEY`, not in a repository file or shell profile.

Reasons:

- Qwen Code always loads `settings.env` as a fallback.
- Qwen Code loads only one `.env` file, and trusted project `.env` files can
  prevent user `.qwen/.env` from loading.
- a wrapper command would break the product goal of returning the user to plain
  `qwen`

If Qwen Code later adds a file-backed provider secret binding, migrate
explicitly.

## Decision 5: Verification Is A Bounded Qwen-Aware Verifier

The installer must not consider file writes sufficient.

OpenCode uses `opencode debug config --pure`; Qwen Code does not currently have
an equivalent audited non-secret command. The v1 verifier therefore proves only
the installer-owned keys from locally inspectable Qwen settings, env precedence,
and shadowing checks. Optional live verification stays behind `--verify-live`.

## Decision 6: Track Qwen Compatibility As A Contract Input

The current Qwen baseline is not a casual README fact. It controls write target
selection, env precedence, project-scope safety, and verification design.

The current baseline is:

- `@qwen-code/qwen-code` `0.18.0`
- source tag `v0.18.0`
- tag commit `a7b8a3655c73c14dde99ab7138a566885e31c68f`
- audit verdict `CONCERNS`

The concern does not block Goal Pack 1 skeleton work. It does block claiming
project-scope managed writes until the later compatibility gates prove the
effective Qwen behavior with executable tests.
