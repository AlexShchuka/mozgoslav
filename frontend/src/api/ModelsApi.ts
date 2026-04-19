import BaseApi from "./BaseApi";
import {API_ENDPOINTS} from "../constants/api";
import type {ModelEntry} from "../domain/Model";

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
            {id},
        );
        return response.data;
    }
}
