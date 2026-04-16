import BaseApi from "./BaseApi";
import type { Recording } from "../models";

export interface ImportResponseDto {
  recordings: Recording[];
}

export class RecordingApi extends BaseApi {
  public async getAll(): Promise<Recording[]> {
    const response = await this.get<Recording[]>("/api/recordings");
    return response.data;
  }

  public async getById(id: string): Promise<Recording> {
    const response = await this.get<Recording>(`/api/recordings/${id}`);
    return response.data;
  }

  public async importFiles(files: File[]): Promise<ImportResponseDto> {
    const form = new FormData();
    files.forEach((file) => form.append("files", file, file.name));
    const response = await this.post<ImportResponseDto, FormData>(
      "/api/recordings/import",
      form
    );
    return response.data;
  }
}
