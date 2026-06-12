# @gonkagate/qwen-code-setup

Set up local Qwen Code to use GonkaGate in one `npx` command.

```bash
npx @gonkagate/qwen-code-setup
```

![Package](https://img.shields.io/badge/package-%40gonkagate%2Fqwen--code--setup-6E63FF?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D22.14.0-4DA2FF?style=flat-square)
![Qwen%20Code](https://img.shields.io/badge/Qwen%20Code-audited%200.18.0-35D6FF?style=flat-square)
![License](https://img.shields.io/badge/license-Apache--2.0-2A2A2A?style=flat-square)

[![Website](https://img.shields.io/badge/Website-gonkagate.com-111827?style=flat-square)](https://gonkagate.com/en)
[![Docs](https://img.shields.io/badge/Docs-API%20Guides-2563EB?style=flat-square)](https://gonkagate.com/en/docs)
[![API%20Key](https://img.shields.io/badge/API%20Key-Dashboard-F97316?style=flat-square)](https://gonkagate.com/en/register)

## Current State

This repository provides the public onboarding CLI for configuring `qwen` to
use GonkaGate as an OpenAI-compatible provider.

The runtime is implemented. It detects Qwen Code, safely collects or reuses a
GonkaGate key, confirms the required model catalog through authenticated
`/v1/models`, writes managed Qwen Code settings with backups and rollback,
verifies locally inspectable durable state, reports current-session shadowing,
and supports redacted human and JSON output.

## Intended Public Flow

The happy path is:

1. user runs `npx @gonkagate/qwen-code-setup`
2. installer validates local `qwen`
3. installer collects a GonkaGate `gp-...` key through safe inputs
4. installer makes a separate authenticated `/v1/models` request to GonkaGate
5. installer confirms all three supported GonkaGate models are available
6. installer offers the public model picker
7. installer writes the minimum Qwen Code settings needed for GonkaGate,
   including all three models in `modelProviders.openai[]`
8. installer verifies the durable local Qwen Code outcome and reports
   current-session shadowing when relevant
9. user returns to plain `qwen`

## Known Qwen Code Baseline

The compatibility baseline is `@qwen-code/qwen-code` `0.18.0`, audited
on June 12, 2026.

The current Qwen Code integration points are:

- binary: `qwen`
- package: `@qwen-code/qwen-code`
- package engine: `>=22.0.0`
- user settings: `~/.qwen/settings.json`
- `QWEN_HOME` user settings: `<QWEN_HOME>/settings.json`
- provider family: `modelProviders.openai[]`
- auth selection: `security.auth.selectedType = "openai"`
- active model selection: `model.name`
- provider key lookup: `envKey`, resolved from Qwen Code environment loading
- model discovery: authenticated `GET https://api.gonkagate.com/v1/models`
  after API-key collection

The audited `0.18.0` source marks `modelProviders` with `replace` merge
semantics. User-scope provider catalog writes are managed in user settings.
Project scope writes only activation settings and blocks if project
`modelProviders` would hide user-managed providers.

The supported v1 GonkaGate model set is:

- `qwen/qwen3-235b-a22b-instruct-2507-fp8`
- `moonshotai/Kimi-K2.6`
- `minimaxai/minimax-m2.7`

## Security Position

The installer must never print a GonkaGate key and must not accept secrets
through a plain `--api-key` flag.

Safe secret inputs are intended to stay aligned with the OpenCode installer:

- hidden interactive prompt
- `GONKAGATE_API_KEY`
- `--api-key-stdin`

The v1 durable secret target is user-level
`settings.env.GONKAGATE_API_KEY` inside the active Qwen settings file. Unlike
OpenCode, the audited Qwen Code docs describe `envKey` and environment loading
rather than an OpenCode-style `{file:...}` provider secret binding.

## Verification And Safety

Default setup success is based on bounded local verification, not a live model
call. `--verify-live` is available only as an explicit opt-in and may spend
quota or depend on provider/network availability.

Use `--dry-run` to see planned managed files and blockers without writing Qwen
settings, backups, or install state.

## Development

```bash
npm install
npm run ci
```

Useful commands:

```bash
npm run typecheck
npm run test
npm run format:check
npm run package:check
```

## Important Documents

- [Product spec](docs/specs/qwen-code-setup-prd/spec.md)
- [How it works](docs/how-it-works.md)
- [Security](docs/security.md)
- [Model validation](docs/model-validation.md)
- [Architecture decisions](docs/architecture-decisions.md)
- [Troubleshooting](docs/troubleshooting.md)
