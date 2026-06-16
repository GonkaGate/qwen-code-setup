# Qwen Code Setup for GonkaGate

Configure Qwen Code to use GonkaGate as an OpenAI-compatible provider with one
developer-friendly `npx` command.

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

`@gonkagate/qwen-code-setup` is a public CLI installer for developers who want
Qwen Code to route chat completions through the GonkaGate API without manually
editing Qwen settings JSON.

## Quick Start

```bash
npx @gonkagate/qwen-code-setup
```

You need:

- Node.js `>=22.14.0`
- Qwen Code installed as `qwen`
- a GonkaGate API key from the dashboard

The runtime is implemented. It writes managed Qwen Code settings after
validating Qwen Code, collecting the key through safe inputs, checking the
GonkaGate model catalog, verifying the local result, and keeping output
redacted.

## What It Does

The happy path is:

1. Detects the local `qwen` binary and verifies the audited Qwen Code baseline.
2. Collects or reuses `GONKAGATE_API_KEY` without printing the secret.
3. Calls authenticated `GET https://api.gonkagate.com/v1/models`.
4. Requires all supported GonkaGate models before writing config.
5. Writes the GonkaGate provider into `modelProviders.openai[]`.
6. Sets `security.auth.selectedType = "openai"` and `model.name`.
7. Stores the durable key reference at `settings.env.GONKAGATE_API_KEY`.
8. Creates backups, rolls back on failure, and reports current-session
   environment shadowing when relevant.

Use `--dry-run` to inspect planned writes before changing local Qwen Code
settings. Use `--json` for machine-readable, redacted output.

## Supported Models

The installer only offers models that are present in GonkaGate's authenticated
model catalog:

- `qwen/qwen3-235b-a22b-instruct-2507-fp8`
- `moonshotai/Kimi-K2.6`
- `minimaxai/minimax-m2.7`

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

## Security

The installer is designed for local developer machines and keeps secrets out of
plain command history.

Allowed secret inputs:

- hidden interactive prompt
- `GONKAGATE_API_KEY`
- `--api-key-stdin`

Not allowed:

- plain `--api-key`
- shell profile mutation
- repository-local secret storage

The v1 durable secret target is user-level
`settings.env.GONKAGATE_API_KEY` inside the active Qwen settings file. Unlike
OpenCode, the audited Qwen Code docs describe `envKey` and environment loading
rather than an OpenCode-style `{file:...}` provider secret binding.

## Verification And Safety

Default setup success is based on bounded local verification, not a live model
call. `--verify-live` is available only as an explicit opt-in and may spend
quota or depend on provider/network availability.

## Local Development

Install and run the full contract suite:

```bash
npm ci
npm run ci
```

Useful focused checks:

```bash
npm run build
npm run typecheck
npm run test
npm run format:check
npm run package:check
npm pack --dry-run
```

Run the CLI from source:

```bash
npm run dev -- --dry-run
```

## Release Flow

This repository uses Release Please and npm trusted publishing.

For changes that should create a release, use a releasable Conventional Commit:

```bash
feat: improve qwen code developer onboarding
```

After that commit lands on `main`, Release Please opens a release PR that bumps
`package.json`, `.release-please-manifest.json`, `CHANGELOG.md`, and
`src/constants/contract.ts`. When that release PR is merged, GitHub Actions
publishes to npm with provenance.

Use `fix:` for patch releases and `feat:` for minor releases. Non-releasable
commits such as `docs:` are useful for internal cleanup, but they should not be
used when the change is intentionally testing the release pipeline.

## Docs

- [Product spec](docs/specs/qwen-code-setup-prd/spec.md)
- [How it works](docs/how-it-works.md)
- [Security](docs/security.md)
- [Model validation](docs/model-validation.md)
- [Architecture decisions](docs/architecture-decisions.md)
- [Troubleshooting](docs/troubleshooting.md)
