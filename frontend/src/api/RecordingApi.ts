import BaseApi from "./BaseApi";
import type { Recording } from "../domain";
import type { ProcessedNote } from "../domain/ProcessedNote";
import { API_ENDPOINTS } from "../constants/api";

export interface ImportResponseDto {
  recordings: Recording[];
}

export interface MeetilyImportResult {
  readonly importedCount: number;
  readonly meetilyDatabasePath: string;
}

export class RecordingApi extends BaseApi {
  public async getAll(): Promise<Recording[]> {
    const response = await this.get<Recording[]>(API_ENDPOINTS.recordings);
    return response.data;
  }

  public async getById(id: string): Promise<Recording> {
    const response = await this.get<Recording>(API_ENDPOINTS.recording(id));
    return response.data;
  }

  public async importFiles(files: File[]): Promise<ImportResponseDto> {
    const form = new FormData();
    files.forEach((file) => form.append("files", file, file.name));
    const response = await this.post<ImportResponseDto, FormData>(
      API_ENDPOINTS.recordingsImport,
      form,
    );
    return response.data;
  }

  public async importByPaths(filePaths: string[], profileId?: string): Promise<Recording[]> {
    const response = await this.post<Recording[], { filePaths: string[]; profileId?: string }>(
      API_ENDPOINTS.recordingsImport,
      { filePaths, profileId },
    );
    return response.data;
  }

  public async upload(files: File[], profileId?: string): Promise<Recording[]> {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    if (profileId) form.append("profileId", profileId);
    const response = await this.post<Recording[], FormData>(
      API_ENDPOINTS.recordingsUpload,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  }

  public async reprocess(recordingId: string, profileId: string): Promise<ProcessedNote> {
    const response = await this.post<ProcessedNote, { profileId: string }>(
      API_ENDPOINTS.reprocess(recordingId),
      { profileId },
    );
    return response.data;
  }

  public async importFromMeetily(meetilyDatabasePath: string): Promise<MeetilyImportResult> {
    const response = await this.post<MeetilyImportResult, { meetilyDatabasePath: string }>(
      API_ENDPOINTS.meetilyImport,
      { meetilyDatabasePath },
    );
    return response.data;
  }
}
