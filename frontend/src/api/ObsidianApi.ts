import BaseApi from "./BaseApi";
import {API_ENDPOINTS} from "../constants/api";

export interface ObsidianSetupReport {
    readonly createdPaths: string[];
}

export interface ObsidianBulkExportResult {
    readonly exportedCount: number;
    readonly skippedCount: number;
    readonly failures: ReadonlyArray<{ noteId: string; reason: string }>;
}

export interface ObsidianApplyLayoutResult {
    readonly createdFolders: number;
    readonly movedNotes: number;
}

export interface ObsidianDetection {
    readonly detected: Array<{ path: string; name: string }>;
    readonly searched: string[];
}

export interface ObsidianRestHealth {
    readonly reachable: boolean;
    readonly host: string;
    readonly version: string | null;
    readonly diagnostic: string;
}

export type DiagnosticAction =
    | "OpenOnboarding"
    | "ReinstallPlugins"
    | "ReapplyBootstrap"
    | "RefreshRestToken"
    | "OpenLmStudioHelp"
    | "OpenSettings";

export type CheckSeverity = "Ok" | "Advisory" | "Warning" | "Error";

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

export class ObsidianApi extends BaseApi {
    public async setup(vaultPath?: string): Promise<ObsidianSetupReport> {
        const response = await this.post<ObsidianSetupReport, { vaultPath?: string }>(
            API_ENDPOINTS.obsidianSetup,
            {vaultPath},
        );
        return response.data;
    }

    public async bulkExport(): Promise<ObsidianBulkExportResult> {
        const response = await this.post<ObsidianBulkExportResult>(API_ENDPOINTS.obsidianExportAll);
        return response.data;
    }

    public async applyLayout(): Promise<ObsidianApplyLayoutResult> {
        const response = await this.post<ObsidianApplyLayoutResult>(
            API_ENDPOINTS.obsidianApplyLayout,
        );
        return response.data;
    }

    public async detect(): Promise<ObsidianDetection> {
        const response = await this.get<ObsidianDetection>("/api/obsidian/detect");
        return response.data;
    }

    public async restHealth(): Promise<ObsidianRestHealth> {
        const response = await this.get<ObsidianRestHealth>("/api/obsidian/rest-health");
        return response.data;
    }

    public async diagnostics(): Promise<VaultDiagnosticsReport> {
        const response = await this.get<VaultDiagnosticsReport>(API_ENDPOINTS.obsidianDiagnostics);
        return response.data;
    }

    public async reapplyBootstrap(): Promise<ObsidianReapplyResult> {
        const response = await this.post<ObsidianReapplyResult>(API_ENDPOINTS.obsidianReapplyBootstrap);
        return response.data;
    }

    public async reinstallPlugins(): Promise<ObsidianReinstallResult> {
        const response = await this.post<ObsidianReinstallResult>(API_ENDPOINTS.obsidianReinstallPlugins);
        return response.data;
    }
}
