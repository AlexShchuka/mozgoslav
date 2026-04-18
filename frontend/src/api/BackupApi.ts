import BaseApi from "./BaseApi";
import { API_ENDPOINTS } from "../constants/api";

export interface BackupFile {
  readonly name: string;
  readonly path: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

export class BackupApi extends BaseApi {
  public async list(): Promise<BackupFile[]> {
    const response = await this.get<BackupFile[]>(API_ENDPOINTS.backup);
    return response.data;
  }

  public async create(): Promise<void> {
    await this.post<void>(API_ENDPOINTS.backupCreate);
  }
}
