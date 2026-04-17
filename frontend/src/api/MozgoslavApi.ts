import axios, { AxiosInstance } from "axios";

import { API_ENDPOINTS, BACKEND_URL } from "../constants/api";
import { AppSettings } from "../models/Settings";
import { ModelEntry } from "../models/Model";
import { ProcessedNote } from "../models/ProcessedNote";
import { ProcessingJob } from "../models/ProcessingJob";
import { Profile } from "../types/Profile";
import { Recording } from "../models/Recording";

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

  // --- notes ---
  listNotes = async (): Promise<ProcessedNote[]> =>
    (await this.client.get<ProcessedNote[]>(API_ENDPOINTS.notes)).data;

  getNote = async (id: string): Promise<ProcessedNote> =>
    (await this.client.get<ProcessedNote>(API_ENDPOINTS.note(id))).data;

  exportNote = async (id: string): Promise<ProcessedNote> =>
    (await this.client.post<ProcessedNote>(API_ENDPOINTS.noteExport(id))).data;

  // --- profiles ---
  listProfiles = async (): Promise<Profile[]> =>
    (await this.client.get<Profile[]>(API_ENDPOINTS.profiles)).data;

  createProfile = async (payload: Omit<Profile, "id" | "isBuiltIn">): Promise<Profile> =>
    (await this.client.post<Profile>(API_ENDPOINTS.profiles, payload)).data;

  updateProfile = async (id: string, payload: Omit<Profile, "id" | "isBuiltIn">): Promise<Profile> =>
    (await this.client.put<Profile>(API_ENDPOINTS.profile(id), payload)).data;

  deleteProfile = async (id: string): Promise<void> => {
    await this.client.delete(API_ENDPOINTS.profile(id));
  };

  // --- settings ---
  getSettings = async (): Promise<AppSettings> =>
    (await this.client.get<AppSettings>(API_ENDPOINTS.settings)).data;

  saveSettings = async (settings: AppSettings): Promise<AppSettings> =>
    (await this.client.put<AppSettings>(API_ENDPOINTS.settings, settings)).data;

  // --- models (read-only per ADR-006 D-11) ---
  listModels = async (): Promise<ModelEntry[]> =>
    (await this.client.get<ModelEntry[]>(API_ENDPOINTS.models)).data;

  // --- meetily ---
  importFromMeetily = async (meetilyDatabasePath: string) =>
    (await this.client.post(API_ENDPOINTS.meetilyImport, { meetilyDatabasePath })).data;

  // --- obsidian ---
  setupObsidian = async (vaultPath?: string) =>
    (await this.client.post(API_ENDPOINTS.obsidianSetup, { vaultPath })).data;

  // --- backup ---
  listBackups = async () => (await this.client.get(API_ENDPOINTS.backup)).data;
  createBackup = async () => (await this.client.post(API_ENDPOINTS.backupCreate)).data;

  // --- logs ---
  listLogs = async () => (await this.client.get(API_ENDPOINTS.logs)).data;
  tailLog = async (file?: string, lines = 200) =>
    (await this.client.get(API_ENDPOINTS.logsTail, { params: { file, lines } })).data;

  // --- dictation ---
  startDictation = async (profileId?: string): Promise<{ sessionId: string }> =>
    (await this.client.post<{ sessionId: string }>(API_ENDPOINTS.dictationStart, { profileId })).data;

  stopDictation = async (sessionId: string): Promise<Recording> =>
    (await this.client.post<Recording>(API_ENDPOINTS.dictationStop(sessionId))).data;

  cancelDictation = async (sessionId: string): Promise<void> => {
    await this.client.post(API_ENDPOINTS.dictationCancel(sessionId));
  };

  // --- queue ---
  cancelQueueJob = async (id: string): Promise<{ markedFailed: boolean }> => {
    const res = await this.client.delete<{ status?: string; markedFailed?: boolean } | "">(
      API_ENDPOINTS.queueCancel(id),
      { validateStatus: (s) => s === 200 || s === 204 },
    );
    return { markedFailed: Boolean((res.data as { markedFailed?: boolean } | "")?.markedFailed) };
  };

  // --- lm studio ---
  listLmStudioModels = async (): Promise<LmStudioDiscoveryResponse> =>
    (await this.client.get<LmStudioDiscoveryResponse>(API_ENDPOINTS.lmStudioModels)).data;
}

export interface LmStudioModelSummary {
  id: string;
  object: string;
}

export interface LmStudioSuggestedModel {
  id: string;
  name: string;
  description: string;
  deepLink: string;
  kind: "llm" | "stt" | "vad";
}

export interface LmStudioDiscoveryResponse {
  installed: LmStudioModelSummary[];
  reachable: boolean;
  suggested: LmStudioSuggestedModel[];
}

export const api = new MozgoslavApi();
