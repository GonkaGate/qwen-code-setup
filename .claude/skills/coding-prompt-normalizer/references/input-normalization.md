# Input Normalization

Preserve exact technical literals before rewriting the prompt.

Important literals in this repo include:

- `qwen-code-setup`
- `npx @gonkagate/qwen-code-setup`
- `@qwen-code/qwen-code`
- `qwen`
- `~/.qwen/settings.json`
- `modelProviders.openai[]`
- `security.auth.selectedType`
- `model.name`
- `envKey`
- `GONKAGATE_API_KEY`
- `--api-key-stdin`
- `docs/specs/qwen-code-setup-prd/spec.md`

Keep named phase boundaries literal: `read-only`, `planning only`, `stop here`,
`technical-design-review only`, and similar constraints must shape the prompt.
