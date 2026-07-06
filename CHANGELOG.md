# Changelog

## [0.3.0](https://github.com/GonkaGate/qwen-code-setup/compare/v0.2.1...v0.3.0) (2026-07-06)


### Features

* fetch GonkaGate models dynamically ([745bcdf](https://github.com/GonkaGate/qwen-code-setup/commit/745bcdfb9767c6d4d93a7b03116650279d92740f))

## [0.2.1](https://github.com/GonkaGate/qwen-code-setup/compare/v0.2.0...v0.2.1) (2026-06-23)

### Bug Fixes

- allow future Qwen Code versions ([676d44d](https://github.com/GonkaGate/qwen-code-setup/commit/676d44d7a0181f82c22b3c584652cd642879eca0))
- allow future Qwen Code versions ([e084d4e](https://github.com/GonkaGate/qwen-code-setup/commit/e084d4e1a2f48f6434e6c5f84311bf2cc74b8794))

## [0.2.0](https://github.com/GonkaGate/qwen-code-setup/compare/v0.1.0...v0.2.0) (2026-06-16)

### Features

- implement qwen code setup runtime ([0449330](https://github.com/GonkaGate/qwen-code-setup/commit/0449330c2a557b2654406b9bd709dfe7932b773b))
- improve qwen code developer onboarding ([18ec322](https://github.com/GonkaGate/qwen-code-setup/commit/18ec3224c354f5fd31b8a9035eb075df52b4144a))
- improve qwen code developer onboarding ([ce4f8f4](https://github.com/GonkaGate/qwen-code-setup/commit/ce4f8f4cc6b5c3b69a280307a39e599f6e231a50))

## 0.1.0

- Bootstrap the public `@gonkagate/qwen-code-setup` repository scaffold.
- Add TypeScript, CI, release, package, docs, contract-test, and mirrored skill infrastructure.
- Record the initial Qwen Code compatibility assumptions without claiming the installer runtime is implemented.
- Expand the Qwen Code setup PRD with concrete v1 requirements for Qwen settings, secret storage, scope behavior, verification, and diagnostics.
- Require authenticated `/v1/models` discovery after API-key intake.
- Implement the Qwen Code setup runtime with safe secret intake, authenticated model discovery, managed user/project settings writes, backups, rollback, dry-run, durable verification, current-session shadowing warnings, redacted human/JSON output, and fake-tested optional live verification.
