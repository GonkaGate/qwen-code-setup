import type { CuratedModelKey } from "../../constants/models.js";
import type { InstallBlocker } from "./blockers.js";

export type InstallScope = "user" | "project";

export interface InstallFlowRequest {
  readonly scope?: InstallScope;
  readonly modelKey?: CuratedModelKey;
  readonly yes: boolean;
  readonly json: boolean;
  readonly apiKeyStdin: boolean;
  readonly dryRun: boolean;
  readonly verifyLive: boolean;
}

export interface ManagedPathSummary {
  readonly kind:
    | "user-settings"
    | "project-settings"
    | "install-state"
    | "backup";
  readonly path: string;
  readonly changed: boolean;
}

export interface InstallWarning {
  readonly code: string;
  readonly message: string;
  readonly layer?: string;
}

export interface BaseInstallFlowResult {
  readonly ok: boolean;
  readonly status:
    | "success"
    | "blocked"
    | "failed"
    | "dry-run"
    | "verification-warning";
  readonly runtimeImplemented: boolean;
  readonly scope?: InstallScope;
  readonly selectedModel?: CuratedModelKey;
  readonly managedPaths: readonly ManagedPathSummary[];
  readonly changed: boolean;
  readonly blockers: readonly InstallBlocker[];
  readonly warnings: readonly InstallWarning[];
}

export interface InstallSuccessResult extends BaseInstallFlowResult {
  readonly ok: true;
  readonly status: "success";
  readonly blockers: readonly [];
}

export interface InstallDryRunResult extends BaseInstallFlowResult {
  readonly ok: true;
  readonly status: "dry-run";
}

export interface InstallVerificationWarningResult extends BaseInstallFlowResult {
  readonly ok: true;
  readonly status: "verification-warning";
  readonly warnings: readonly [InstallWarning, ...InstallWarning[]];
}

export interface InstallBlockedResult extends BaseInstallFlowResult {
  readonly ok: false;
  readonly status: "blocked";
  readonly blockers: readonly [InstallBlocker, ...InstallBlocker[]];
}

export interface InstallFailedResult extends BaseInstallFlowResult {
  readonly ok: false;
  readonly status: "failed";
  readonly errorCode: string;
  readonly message: string;
}

export type InstallFlowResult =
  | InstallSuccessResult
  | InstallDryRunResult
  | InstallVerificationWarningResult
  | InstallBlockedResult
  | InstallFailedResult;
