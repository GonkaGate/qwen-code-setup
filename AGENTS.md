@/Users/daniil/.codex/RTK.md

--- project-doc ---

# AGENTS.md

## What This Repository Is

`qwen-code-setup` is the public open-source onboarding repository for the
GonkaGate CLI that will configure local Qwen Code to use GonkaGate as an
OpenAI-compatible provider.

Intended public flow:

```bash
npx @gonkagate/qwen-code-setup
```

Current honest state:

- the repository scaffold is implemented
- the Qwen Code installer runtime is implemented with managed writes,
  backups, rollback, dry-run, local verification, redacted JSON/human output,
  and fake-tested optional live verification
- package, CI, docs, contract tests, release scaffolding, and mirrored skills
  are present
- the latest audited stable upstream Qwen Code release is
  `@qwen-code/qwen-code` `0.18.0` as of June 12, 2026
- parsed newer Qwen Code versions are not blocked solely because they are newer;
  real setup and verification checks should surface actual incompatibilities

If the implementation status, package name, security flow, config locations,
transport contract, or audited Qwen Code assumptions change, this file must be
updated immediately so it stays truthful.

## Fixed Product Invariants

- the npm package is `@gonkagate/qwen-code-setup`
- the intended public npm entrypoint is `npx @gonkagate/qwen-code-setup`
- the stable GonkaGate provider identity is `gonkagate`
- the canonical base URL is `https://api.gonkagate.com/v1`
- current transport target is OpenAI-compatible chat completions
- arbitrary custom base URLs are out of scope for v1
- arbitrary custom model ids are out of scope for v1
- no plain CLI flag may carry the secret
- secrets must not be accepted through a plain CLI flag such as `--api-key`
- safe secret inputs are:
  - hidden interactive prompt
  - `GONKAGATE_API_KEY`
  - `--api-key-stdin`
- shell profile mutation is out of scope
- repository-local secret storage is out of scope

## Current Qwen Code Assumptions

These audited assumptions are the current implementation contract:

- package: `@qwen-code/qwen-code`
- binary: `qwen`
- audited version: `0.18.0`
- runtime version policy: allow any parsed Qwen Code version; do not gate
  future versions by exact audited-version equality
- npm package engine: `>=22.0.0`
- user settings path: `~/.qwen/settings.json`
- OpenAI-compatible providers live under `modelProviders.openai[]`
- provider entries use `id`, `name`, `baseUrl`, and `envKey`
- auth selection uses `security.auth.selectedType = "openai"`
- active model selection uses `model.name`
- Qwen Code reads provider keys through environment variables named by `envKey`
- Qwen Code loads env values in this order: CLI flags, `process.env`, the first
  selected `.env` file, then `settings.env`
- the v1 durable secret target is user-level
  `settings.env.GONKAGATE_API_KEY`
- after API-key collection, the installer must make a separate authenticated
  `GET https://api.gonkagate.com/v1/models` request before rendering the
  picker or writing config
- authenticated `/v1/models` is the source of truth for user-visible model ids,
  names, `--model` validation, default selection, and managed provider writes
- no checked-in GonkaGate model id list may become the runtime source of truth
- `qwen auth` is removed in the audited baseline; status is an interactive
  `/doctor` concern rather than a standalone `qwen auth status` command
- `modelProviders` is currently marked with `replace` merge semantics, so
  project-scope writes are activation-only and block when project providers
  would hide user-managed providers

Re-audit these assumptions before expanding managed write targets, changing
scope behavior, or updating the Qwen Code baseline.

## Repository Structure

```text
.
├── AGENTS.md
├── README.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.build.json
├── .github/workflows/
├── bin/
│   └── gonkagate-qwen-code.js
├── docs/
│   ├── README.md
│   ├── architecture-decisions.md
│   ├── how-it-works.md
│   ├── model-validation.md
│   ├── security.md
│   ├── troubleshooting.md
│   └── specs/
│       └── qwen-code-setup-prd/spec.md
├── scripts/
│   └── run-tests.mjs
├── .agents/skills/
├── .claude/skills/
├── src/
│   ├── cli.ts
│   ├── entrypoint.ts
│   ├── constants/
│   └── install/
└── test/
    ├── cli.test.ts
    ├── docs-contract.test.ts
    ├── package-contract.test.ts
    ├── skills-contract.test.ts
    └── contract-helpers.ts
```

## Important Surfaces

### `README.md`

Primary public repository summary. Keep implementation status, package name,
intended `npx` entrypoint, Qwen Code config targets, and security posture
truthful.

### `docs/specs/qwen-code-setup-prd/spec.md`

The product source of truth for the setup tool.

### `src/cli.ts`

Current public runtime entrypoint. It parses CLI options, runs the managed Qwen
Code setup flow, and renders redacted human or JSON output.

### `src/install/`

Runtime boundary for Qwen Code detection, path resolution, managed settings
writes, secret persistence, rollback, dry-run, verification, and optional live
verification.

### `.agents/skills/` and `.claude/skills/`

Mirrored skill pack used for repo-local engineering workflows. Mirror updates
across both trees when the shared skill pack changes.

## Change Discipline

When behavior changes:

- update `AGENTS.md`
- update `README.md`
- update relevant files in `docs/`
- update `CHANGELOG.md` when the change is meaningful to users or contributors
- update tests under `test/` if the repository contract changed
- keep mirrored `.agents` and `.claude` skill assets aligned
- keep current-contract docs and historical planning docs explicitly labeled so
  they cannot contradict each other silently

## Validation

Current local validation baseline:

```bash
npm run ci
```

That command should stay green before treating scaffold, contract, or doc
changes as ready.

@RTK.md
