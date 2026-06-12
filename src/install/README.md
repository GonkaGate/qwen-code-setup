# Installer Runtime

This directory owns the Qwen Code installer runtime.

Current state: implemented for the v1 managed setup contract.

Runtime ownership:

- Qwen Code detection
- path and platform resolution
- safe secret intake
- managed Qwen settings parsing and writes
- rollback/backups
- redacted diagnostics
- effective setup verification

Read `docs/specs/qwen-code-setup-prd/spec.md` before adding runtime modules.
