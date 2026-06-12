# Model Validation

This document records the validation gate for curated GonkaGate models exposed
through `@gonkagate/qwen-code-setup`.

## Current Supported Models

The v1 installer must support all three GonkaGate models currently available
for this setup flow:

- `qwen/qwen3-235b-a22b-instruct-2507-fp8`
- `moonshotai/Kimi-K2.6`
- `minimaxai/minimax-m2.7`

The static registry records each model with:

- a stable curated key
- the GonkaGate model id
- a display label
- `status: "validated"`
- validation evidence date
- Qwen Code compatibility notes for the audited `0.18.0` baseline
- optional Qwen `generationConfig` fragments

Exactly one registry entry is marked as the recommended default for `--yes`.
For the current set, that default is
`qwen/qwen3-235b-a22b-instruct-2507-fp8`.

After collecting the GonkaGate API key, the installer must make a separate
authenticated request to `https://api.gonkagate.com/v1/models` and confirm that
all three ids are available before showing the picker or writing Qwen Code
settings.

If any required id is missing, setup must fail with
`required_models_unavailable` instead of writing a partial provider catalog.

## Minimum Validation Proof

Before a model can be added to or removed from the supported set, record proof
for:

- GonkaGate `/v1/models` availability for an authenticated `gp-...` key
- Qwen Code model provider selection
- non-streaming chat completion
- streaming chat completion if Qwen Code uses streaming for normal operation
- tool/function calling behavior if Qwen Code requires it for agentic tasks
- context-window assumptions
- timeout/retry behavior
- any provider-specific generation settings

## Registry And Runtime Rule

Only models with `status: "validated"` and present in the authenticated
`/v1/models` response should appear in the end-user picker.

The Qwen Code provider catalog under `modelProviders.openai[]` must include all
three supported models, not only the selected default. The selected default
controls `model.name`.

Unsupported curated model keys and arbitrary raw model ids must fail before any
runtime work. Extra GonkaGate `/v1/models` entries remain ignored until this
registry and the public docs are explicitly updated.
