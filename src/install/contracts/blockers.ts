export const PRD_INSTALL_BLOCKER_CODES = [
  "qwen_not_found",
  "qwen_version_unsupported",
  "settings_parse_failed",
  "managed_write_failed",
  "model_conflict",
  "validated_models_unavailable",
  "required_models_unavailable",
  "secret_missing",
  "secret_shadowed_by_process_env",
  "secret_shadowed_by_project_env",
  "project_modelproviders_override",
  "system_settings_override",
  "verification_incomplete",
  "live_verify_failed",
] as const;

export const INSTALL_BLOCKER_CODES = [
  ...PRD_INSTALL_BLOCKER_CODES,
  "runtime_not_implemented",
] as const;

export type PrdInstallBlockerCode = (typeof PRD_INSTALL_BLOCKER_CODES)[number];

export type InstallBlockerCode = (typeof INSTALL_BLOCKER_CODES)[number];

export interface InstallBlocker {
  readonly code: InstallBlockerCode;
  readonly message: string;
  readonly layer?: string;
  readonly path?: string;
  readonly nextAction?: string;
}

export function createBlocker(blocker: InstallBlocker): InstallBlocker {
  return blocker;
}
