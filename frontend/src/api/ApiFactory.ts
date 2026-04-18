import axios, { type AxiosInstance } from "axios";
import { BACKEND_URL } from "../constants/api";
import { BackupApi } from "./BackupApi";
import { DictationApi } from "./DictationApi";
import { HealthApi } from "./HealthApi";
import { JobsApi } from "./JobsApi";
import { LogsApi } from "./LogsApi";
import { MetaApi } from "./MetaApi";
import { ModelsApi } from "./ModelsApi";
import { NotesApi } from "./NotesApi";
import { ObsidianApi } from "./ObsidianApi";
import { ProfilesApi } from "./ProfilesApi";
import { RagApi } from "./RagApi";
import { RecordingApi } from "./RecordingApi";
import { SettingsApi } from "./SettingsApi";

export interface ApiFactory {
  createBackupApi(client?: AxiosInstance): BackupApi;
  createDictationApi(client?: AxiosInstance): DictationApi;
  createHealthApi(client?: AxiosInstance): HealthApi;
  createJobsApi(client?: AxiosInstance): JobsApi;
  createLogsApi(client?: AxiosInstance): LogsApi;
  createMetaApi(client?: AxiosInstance): MetaApi;
  createModelsApi(client?: AxiosInstance): ModelsApi;
  createNotesApi(client?: AxiosInstance): NotesApi;
  createObsidianApi(client?: AxiosInstance): ObsidianApi;
  createProfilesApi(client?: AxiosInstance): ProfilesApi;
  createRagApi(client?: AxiosInstance): RagApi;
  createRecordingApi(client?: AxiosInstance): RecordingApi;
  createSettingsApi(client?: AxiosInstance): SettingsApi;
}

let sharedClient: AxiosInstance | null = null;

const getDefaultClient = (): AxiosInstance => {
  if (!sharedClient) {
    sharedClient = axios.create({
      timeout: 30_000,
      headers: { Accept: "application/json" },
    });
  }
  return sharedClient;
};

const pick = (client?: AxiosInstance): AxiosInstance => client ?? getDefaultClient();

const apiFactory: ApiFactory = {
  createBackupApi: (client) => new BackupApi(pick(client), BACKEND_URL),
  createDictationApi: (client) => new DictationApi(pick(client), BACKEND_URL),
  createHealthApi: (client) => new HealthApi(pick(client), BACKEND_URL),
  createJobsApi: (client) => new JobsApi(pick(client), BACKEND_URL),
  createLogsApi: (client) => new LogsApi(pick(client), BACKEND_URL),
  createMetaApi: (client) => new MetaApi(pick(client), BACKEND_URL),
  createModelsApi: (client) => new ModelsApi(pick(client), BACKEND_URL),
  createNotesApi: (client) => new NotesApi(pick(client), BACKEND_URL),
  createObsidianApi: (client) => new ObsidianApi(pick(client), BACKEND_URL),
  createProfilesApi: (client) => new ProfilesApi(pick(client), BACKEND_URL),
  createRagApi: (client) => new RagApi(pick(client), BACKEND_URL),
  createRecordingApi: (client) => new RecordingApi(pick(client), BACKEND_URL),
  createSettingsApi: (client) => new SettingsApi(pick(client), BACKEND_URL),
};

export default apiFactory;
