export type CheckSeverity = "Ok" | "Advisory" | "Warning" | "Error";

export type DiagnosticAction =
  | "OpenOnboarding"
  | "ReinstallPlugins"
  | "ReapplyBootstrap"
  | "RefreshRestToken"
  | "OpenLmStudioHelp"
  | "OpenSettings";

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
  readonly status: "Ok" | "Missing" | "Outdated" | "UserModified" | "Extra";
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

export interface ObsidianReinstallResult {
  readonly plugins: ReadonlyArray<{
    readonly pluginId: string;
    readonly status: string;
    readonly message: string | null;
    readonly writtenFiles: readonly string[];
  }>;
  readonly report: VaultDiagnosticsReport;
}

export interface ObsidianReapplyResult {
  readonly report: VaultDiagnosticsReport;
}

export interface ObsidianBulkExportError {
  readonly error: string;
  readonly hint: string;
  readonly actions: readonly DiagnosticAction[];
}
