import axios, { AxiosInstance } from "axios";

import { API_ENDPOINTS, BACKEND_URL } from "../constants/api";
import { AppSettings } from "../domain/Settings";
import { ModelEntry } from "../domain/Model";
import { ProcessedNote } from "../domain/ProcessedNote";
import { ProcessingJob } from "../domain/ProcessingJob";
import { Profile } from "../domain/Profile";
import { RagAnswer } from "../domain/Rag";
import { Recording } from "../domain/Recording";

/**
 * Typed thin wrapper over the backend REST API. The frontend consumes this via
 * sagas or directly from components. Single client instance keeps baseURL,
 * timeout, and interceptors consistent.
 */
export class MozgoslavApi {
  private readonly client: AxiosInstance;

  constructor(baseURL: string = BACKEND_URL) {
    this.client = axios.create({ baseURL, timeout: 30_000 });
  }

  // --- health ---
  health = async (): Promise<{ status: string }> =>
    (await this.client.get(API_ENDPOINTS.health)).data;

  llmHealth = async (): Promise<boolean> =>
    (await this.client.get<{ available: boolean }>(API_ENDPOINTS.llmHealth)).data.available;

  // --- recordings ---
  listRecordings = async (): Promise<Recording[]> =>
    (await this.client.get<Recording[]>(API_ENDPOINTS.recordings)).data;

  importByPaths = async (filePaths: string[], profileId?: string): Promise<Recording[]> =>
    (await this.client.post<Recording[]>(API_ENDPOINTS.recordingsImport, { filePaths, profileId })).data;

  uploadFiles = async (files: File[], profileId?: string): Promise<Recording[]> => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    if (profileId) form.append("profileId", profileId);
    const res = await this.client.post<Recording[]>(API_ENDPOINTS.recordingsUpload, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  };

  reprocess = async (recordingId: string, profileId: string): Promise<ProcessedNote> =>
    (await this.client.post<ProcessedNote>(API_ENDPOINTS.reprocess(recordingId), { profileId })).data;

  // --- jobs ---
  listJobs = async (): Promise<ProcessingJob[]> =>
    (await this.client.get<ProcessingJob[]>(API_ENDPOINTS.jobs)).data;

  listActiveJobs = async (): Promise<ProcessingJob[]> =>
    (await this.client.get<ProcessingJob[]>(API_ENDPOINTS.jobsActive)).data;

  // BC-015 — queued / running jobs get cancelled through this endpoint.
  // Backend flips the row to Cancelled and the SSE stream emits the update.
  cancelQueueJob = async (id: string): Promise<void> => {
    await this.client.delete(API_ENDPOINTS.queueCancel(id));
  };

  // --- notes ---
  listNotes = async (): Promise<ProcessedNote[]> =>
    (await this.client.get<ProcessedNote[]>(API_ENDPOINTS.notes)).data;

  getNote = async (id: string): Promise<ProcessedNote> =>
    (await this.client.get<ProcessedNote>(API_ENDPOINTS.note(id))).data;

  exportNote = async (id: string): Promise<ProcessedNote> =>
    (await this.client.post<ProcessedNote>(API_ENDPOINTS.noteExport(id))).data;

  // BC-022 — "Add Note" modal submits a hand-written note which becomes part
  // of the RAG corpus alongside transcribed recordings.
  createNote = async (payload: { title: string; body: string }): Promise<ProcessedNote> =>
    (await this.client.post<ProcessedNote>(API_ENDPOINTS.notes, payload)).data;

  // --- profiles ---
  listProfiles = async (): Promise<Profile[]> =>
    (await this.client.get<Profile[]>(API_ENDPOINTS.profiles)).data;

  createProfile = async (payload: Omit<Profile, "id" | "isBuiltIn">): Promise<Profile> =>
    (await this.client.post<Profile>(API_ENDPOINTS.profiles, payload)).data;

  updateProfile = async (id: string, payload: Omit<Profile, "id" | "isBuiltIn">): Promise<Profile> =>
    (await this.client.put<Profile>(API_ENDPOINTS.profile(id), payload)).data;

  // Built-in profiles are protected by the backend (409 on delete). UI surfaces
  // the error as a toast and keeps the row in the list.
  deleteProfile = async (id: string): Promise<void> => {
    await this.client.delete(API_ENDPOINTS.profile(id));
  };

  // Server-side copy with "(copy)" suffix — returns the new row so the UI can
  // insert it without a full refresh.
  duplicateProfile = async (id: string): Promise<Profile> =>
    (await this.client.post<Profile>(API_ENDPOINTS.duplicateProfile(id))).data;

  // --- settings ---
  getSettings = async (): Promise<AppSettings> =>
    (await this.client.get<AppSettings>(API_ENDPOINTS.settings)).data;

  saveSettings = async (settings: AppSettings): Promise<AppSettings> =>
    (await this.client.put<AppSettings>(API_ENDPOINTS.settings, settings)).data;

  // --- models ---
  listModels = async (): Promise<ModelEntry[]> =>
    (await this.client.get<ModelEntry[]>(API_ENDPOINTS.models)).data;

  downloadModel = async (id: string): Promise<{ id: string; destinationPath: string }> =>
    (await this.client.post(API_ENDPOINTS.modelDownload, { id })).data;

  // --- meetily ---
  importFromMeetily = async (meetilyDatabasePath: string) =>
    (await this.client.post(API_ENDPOINTS.meetilyImport, { meetilyDatabasePath })).data;

  // --- obsidian ---
  setupObsidian = async (vaultPath?: string) =>
    (await this.client.post(API_ENDPOINTS.obsidianSetup, { vaultPath })).data;

  // BC-025 Phase 2 MR B — bulk-export every un-exported note in one request.
  bulkExportObsidian = async (): Promise<{ exportedCount: number }> =>
    (await this.client.post<{ exportedCount: number }>(API_ENDPOINTS.obsidianExportAll)).data;

  // BC-025 Phase 2 MR B — rearrange vault files into the PARA folder scheme.
  applyObsidianLayout = async (): Promise<{ createdFolders: number; movedNotes: number }> =>
    (
      await this.client.post<{ createdFolders: number; movedNotes: number }>(
        API_ENDPOINTS.obsidianApplyLayout,
      )
    ).data;

  // --- backup ---
  listBackups = async () => (await this.client.get(API_ENDPOINTS.backup)).data;
  createBackup = async () => (await this.client.post(API_ENDPOINTS.backupCreate)).data;

  // --- logs ---
  listLogs = async () => (await this.client.get(API_ENDPOINTS.logs)).data;
  tailLog = async (file?: string, lines = 200) =>
    (await this.client.get(API_ENDPOINTS.logsTail, { params: { file, lines } })).data;

  // --- rag ---
  ragQuery = async (question: string, topK?: number): Promise<RagAnswer> =>
    (await this.client.post<RagAnswer>(API_ENDPOINTS.ragQuery, { question, topK })).data;

  ragReindex = async (): Promise<{ indexed: number }> =>
    (await this.client.post<{ indexed: number }>(API_ENDPOINTS.ragReindex)).data;

  // --- dictation ---
  // BC-004 — lifecycle triplet. Browser pushes Opus-in-WebM chunks every
  // 250 ms; backend /api/dictation/{id}/push must accept octet-stream bodies
  // and decode via ffmpeg (coordination item flagged in phase2 report).
  startDictation = async (payload: { source: string }): Promise<{ sessionId: string }> =>
    (await this.client.post<{ sessionId: string }>(API_ENDPOINTS.dictationStart, payload)).data;

  dictationPush = async (sessionId: string, audioBuffer: ArrayBuffer): Promise<void> => {
    await this.client.post(API_ENDPOINTS.dictationPush(sessionId), audioBuffer, {
      headers: { "Content-Type": "application/octet-stream" },
      transformRequest: [(body: unknown) => body],
    });
  };

  stopDictation = async (sessionId: string): Promise<{ transcript: string }> =>
    (
      await this.client.post<{ transcript: string }>(API_ENDPOINTS.dictationStop(sessionId))
    ).data;
}

export const api = new MozgoslavApi();
