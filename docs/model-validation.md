# Model Validation

This document records the live model discovery rule for
`@gonkagate/qwen-code-setup`.

## Source Of Truth

The installer has no checked-in user-facing GonkaGate model id list. After
collecting the GonkaGate API key, it must make authenticated
`GET https://api.gonkagate.com/v1/models` with Bearer auth.

The OpenAI-compatible response shape is expected to contain at least:

```json
{
  "data": [{ "id": "provider/model", "name": "Optional display name" }]
}
```

The installer deduplicates returned ids, rejects malformed or empty responses
with `validated_models_unavailable`, and uses the remaining live models for:

- the interactive picker
- `--model` validation
- the `--yes` default, which is the first fetched model
- `modelProviders.openai[]` writes
- `model.name`
- install-state managed model metadata

## Runtime Rule

Only models returned by authenticated `/v1/models` for the user's key should
appear in the picker or be accepted by `--model`.

The Qwen Code provider catalog under `modelProviders.openai[]` must include the
live fetched model ids for that run, not a static subset. The selected
model controls `model.name`.

Adding or removing a model in the GonkaGate network must not require a
repository change. No checked-in GonkaGate model id list may become the runtime
source of truth.
