# Changelog

## [0.2.0](https://github.com/GonkaGate/qwen-code-setup/compare/v0.1.0...v0.2.0) (2026-06-12)


### Features

* implement qwen code setup runtime ([b8bb18b](https://github.com/GonkaGate/qwen-code-setup/commit/b8bb18b4edc2f21af1829760bd5da945d6f5d8c9))

## 0.1.0

- Bootstrap the public `@gonkagate/qwen-code-setup` repository scaffold.
- Add TypeScript, CI, release, package, docs, contract-test, and mirrored skill infrastructure.
- Record the initial Qwen Code compatibility assumptions without claiming the installer runtime is implemented.
- Expand the Qwen Code setup PRD with concrete v1 requirements for Qwen settings, secret storage, scope behavior, verification, and diagnostics.
- Require support for all three current GonkaGate models and authenticated `/v1/models` discovery after API-key intake.
- Implement the Qwen Code setup runtime with safe secret intake, authenticated model discovery, managed user/project settings writes, backups, rollback, dry-run, durable verification, current-session shadowing warnings, redacted human/JSON output, and fake-tested optional live verification.
