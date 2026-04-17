import BaseApi from "./BaseApi";
import { API_ENDPOINTS } from "../constants/api";
import type { ProcessedNote } from "../domain/ProcessedNote";

export interface CreateNotePayload {
  readonly title: string;
  readonly body: string;
}

export class NotesApi extends BaseApi {
  public async list(): Promise<ProcessedNote[]> {
    const response = await this.get<ProcessedNote[]>(API_ENDPOINTS.notes);
    return response.data;
  }

  public async getById(id: string): Promise<ProcessedNote> {
    const response = await this.get<ProcessedNote>(API_ENDPOINTS.note(id));
    return response.data;
  }

  // BC-022 — "Add Note" modal submits a hand-written note which becomes part
  // of the RAG corpus alongside transcribed recordings.
  public async create(payload: CreateNotePayload): Promise<ProcessedNote> {
    const response = await this.post<ProcessedNote, CreateNotePayload>(
      API_ENDPOINTS.notes,
      payload,
    );
    return response.data;
  }

  public async exportNote(id: string): Promise<ProcessedNote> {
    const response = await this.post<ProcessedNote>(API_ENDPOINTS.noteExport(id));
    return response.data;
  }
}
