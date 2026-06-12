---
name: qwen-code-compatibility-audit
description: "Read-only compatibility audit for qwen-code-setup against current Qwen Code upstream. Use whenever work depends on Qwen Code config, auth, modelProviders, envKey behavior, CLI commands, version support, or whether the installer can safely write and verify Qwen Code settings."
---

# Qwen Code Compatibility Audit

## Purpose

Establish current upstream truth before changing `qwen-code-setup` product,
runtime, docs, or tests.

Qwen Code moves quickly. Do not rely only on old local notes when the task
depends on config, auth, provider, model, or verification behavior.

## Required Sources

Use primary sources first:

- Qwen Code docs
- `QwenLM/qwen-code` source for the audited release or current `main`
- npm metadata for `@qwen-code/qwen-code`
- local CLI smoke commands only with disposable `QWEN_HOME` / runtime dirs

Do not use community snippets as authority unless the task is specifically
about community reports.

## Audit Checklist

Verify and report:

- current stable `@qwen-code/qwen-code` version and Node engine
- binary name and install/run command
- user settings path and any `QWEN_HOME` behavior
- workspace/project settings precedence and trust behavior
- `modelProviders.openai[]` shape
- whether `modelProviders` merge or replace across scopes
- provider fields such as `id`, `name`, `baseUrl`, `envKey`, and generation
  config
- `security.auth.selectedType` behavior
- `model.name` behavior and duplicate model-id handling
- environment loading precedence for provider keys
- whether `qwen auth` exists or is removed
- whether `/doctor` or another command can be used for status
- whether any non-interactive resolved-config/debug command exists
- whether output may contain secrets

## Installer Implications

Translate findings into product impact:

- safe managed write target
- secret-storage options and trade-offs
- project-scope blockers
- effective-config verification strategy
- docs or contract tests that must change
- whether implementation is ready or still blocked by a design gate

## Output Shape

Lead with a verdict:

- `PASS`: current upstream supports the planned installer contract
- `CONCERNS`: possible but design or proof gaps remain
- `FAIL`: current upstream blocks the planned installer contract

Then include:

- audited version/date
- evidence list with source paths or URLs
- compatibility findings
- blocker list
- recommended next task

Never include raw API keys, raw `.env` contents, or raw resolved config that may
contain substituted secrets.
