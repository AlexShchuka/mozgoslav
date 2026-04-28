export type CheckSeverity = "OK" | "ADVISORY" | "WARNING" | "ERROR";

export type DiagnosticAction =
  | "OPEN_ONBOARDING"
  | "REINSTALL_PLUGINS"
  | "REAPPLY_BOOTSTRAP"
  | "REFRESH_REST_TOKEN"
  | "OPEN_LM_STUDIO_HELP"
  | "OPEN_SETTINGS";

export type BootstrapDriftStatus = "OK" | "MISSING" | "OUTDATED" | "USER_MODIFIED" | "EXTRA";

export interface VaultPathCheck {
  readonly ok: boolean;
  readonly severity: CheckSeverity;
  readonly code: string;
  readonly message: string;
  readonly actions: readonly DiagnosticAction[];
  readonly vaultPath: string;
}

export interface PluginCheck {
  readonly pluginId: string;
  readonly installed: boolean;
  readonly enabled: boolean;
  readonly hashMatches: boolean;
  readonly optional: boolean;
  readonly expectedVersion: string;
  readonly installedVersion: string | null;
  readonly severity: CheckSeverity;
  readonly code: string;
  readonly message: string;
  readonly actions: readonly DiagnosticAction[];
  readonly ok: boolean;
}

export interface TemplaterSettingsCheck {
  readonly ok: boolean;
  readonly severity: CheckSeverity;
  readonly code: string;
  readonly message: string;
  readonly actions: readonly DiagnosticAction[];
  readonly templatesFolder: string | null;
  readonly userScriptsFolder: string | null;
}

export interface BootstrapFileDrift {
  readonly vaultRelativePath: string;
  readonly status: BootstrapDriftStatus;
  readonly expectedSha256: string;
  readonly actualSha256: string | null;
}

export interface BootstrapDriftCheck {
  readonly ok: boolean;
  readonly severity: CheckSeverity;
  readonly code: string;
  readonly message: string;
  readonly actions: readonly DiagnosticAction[];
  readonly files: readonly BootstrapFileDrift[];
}

export interface RestApiCheck {
  readonly ok: boolean;
  readonly required: boolean;
  readonly severity: CheckSeverity;
  readonly code: string;
  readonly message: string;
  readonly actions: readonly DiagnosticAction[];
  readonly host: string | null;
  readonly version: string | null;
}

export interface LmStudioCheck {
  readonly ok: boolean;
  readonly severity: CheckSeverity;
  readonly code: string;
  readonly message: string;
  readonly actions: readonly DiagnosticAction[];
  readonly endpoint: string | null;
}

export interface VaultDiagnosticsReport {
  readonly snapshotId: string;
  readonly vault: VaultPathCheck;
  readonly plugins: readonly PluginCheck[];
  readonly templater: TemplaterSettingsCheck;
  readonly bootstrap: BootstrapDriftCheck;
  readonly restApi: RestApiCheck;
  readonly lmStudio: LmStudioCheck;
  readonly generatedAt: string;
  readonly isHealthy: boolean;
}

export interface ReapplyBootstrapResult {
  readonly overwritten: readonly string[];
  readonly skipped: readonly string[];
  readonly backedUpTo: string | null;
}

export interface ReinstallPluginsResult {
  readonly reinstalled: readonly string[];
}
