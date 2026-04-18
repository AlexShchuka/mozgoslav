import BaseApi from "./BaseApi";
import { API_ENDPOINTS } from "../constants/api";

export interface ObsidianSetupReport {
  readonly createdPaths: string[];
}

export interface ObsidianBulkExportResult {
  readonly exportedCount: number;
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

export class ObsidianApi extends BaseApi {
  public async setup(vaultPath?: string): Promise<ObsidianSetupReport> {
    const response = await this.post<ObsidianSetupReport, { vaultPath?: string }>(
      API_ENDPOINTS.obsidianSetup,
      { vaultPath },
    );
    return response.data;
  }

  // BC-025 Phase 2 MR B — bulk-export every un-exported note in one request.
  public async bulkExport(): Promise<ObsidianBulkExportResult> {
    const response = await this.post<ObsidianBulkExportResult>(API_ENDPOINTS.obsidianExportAll);
    return response.data;
  }

  // BC-025 Phase 2 MR B — rearrange vault files into the PARA folder scheme.
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
}
