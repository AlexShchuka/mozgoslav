import BaseApi from "./BaseApi";
import { API_ENDPOINTS } from "../constants/api";
import type { ModelEntry } from "../domain/Model";

// Task #12b / #13 — the backend returns 202 Accepted with `{ downloadId }`
// so the caller can subscribe to `/api/models/download/stream?downloadId=…`
// via <ModelDownloadProgress />. Previously we declared `{ id, destinationPath }`
// which never matched the actual payload, so no caller could wire up progress.
export interface ModelDownloadResult {
  readonly downloadId: string;
}

export class ModelsApi extends BaseApi {
  public async list(): Promise<ModelEntry[]> {
    const response = await this.get<ModelEntry[]>(API_ENDPOINTS.models);
    return response.data;
  }

  public async download(id: string): Promise<ModelDownloadResult> {
    const response = await this.post<ModelDownloadResult, { id: string }>(
      API_ENDPOINTS.modelDownload,
      { id },
    );
    return response.data;
  }
}
