import type {ApiFactory} from "../api";
import type {BackupApi} from "../api/BackupApi";
import type {DictationApi} from "../api/DictationApi";
import type {HealthApi} from "../api/HealthApi";
import type {JobsApi} from "../api/JobsApi";
import type {LogsApi} from "../api/LogsApi";
import type {MetaApi} from "../api/MetaApi";
import type {ModelsApi} from "../api/ModelsApi";
import type {NotesApi} from "../api/NotesApi";
import type {ObsidianApi} from "../api/ObsidianApi";
import type {ProfilesApi} from "../api/ProfilesApi";
import type {RagApi} from "../api/RagApi";
import type {RecordingApi} from "../api/RecordingApi";
import type {SettingsApi} from "../api/SettingsApi";

type AsyncMethods<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => Promise<infer R>
        ? jest.Mock<Promise<R>, A>
        : T[K];
};

export type MockedBackupApi = AsyncMethods<BackupApi>;
export type MockedDictationApi = AsyncMethods<DictationApi>;
export type MockedHealthApi = AsyncMethods<HealthApi>;
export type MockedJobsApi = AsyncMethods<JobsApi>;
export type MockedLogsApi = AsyncMethods<LogsApi>;
export type MockedMetaApi = AsyncMethods<MetaApi>;
export type MockedModelsApi = AsyncMethods<ModelsApi>;
export type MockedNotesApi = AsyncMethods<NotesApi>;
export type MockedObsidianApi = AsyncMethods<ObsidianApi>;
export type MockedProfilesApi = AsyncMethods<ProfilesApi>;
export type MockedRagApi = AsyncMethods<RagApi>;
export type MockedRecordingApi = AsyncMethods<RecordingApi>;
export type MockedSettingsApi = AsyncMethods<SettingsApi>;

export interface MockApiBundle {
    readonly factory: ApiFactory;
    readonly backupApi: MockedBackupApi;
    readonly dictationApi: MockedDictationApi;
    readonly healthApi: MockedHealthApi;
    readonly jobsApi: MockedJobsApi;
    readonly logsApi: MockedLogsApi;
    readonly metaApi: MockedMetaApi;
    readonly modelsApi: MockedModelsApi;
    readonly notesApi: MockedNotesApi;
    readonly obsidianApi: MockedObsidianApi;
    readonly profilesApi: MockedProfilesApi;
    readonly ragApi: MockedRagApi;
    readonly recordingApi: MockedRecordingApi;
    readonly settingsApi: MockedSettingsApi;
}

const jestFn = <T = unknown>(): jest.Mock => jest.fn<Promise<T>, unknown[]>();

/**
 * Returns a cohesive bundle of mocked per-domain API clients plus an
 * `ApiFactory` that hands each one out. Tests jest.mock("../api", () =>
 * createMockApi()) and then reach into `.notesApi` etc. to arrange behaviour.
 *
 * Typing comes from the real API classes — adding/removing a method in a
 * real client breaks the compile step of any test that references the
 * missing member, so drift is caught at build time rather than runtime.
 */
export const createMockApi = (): MockApiBundle => {
    const backupApi = {
        list: jestFn(),
        create: jestFn(),
    } as unknown as MockedBackupApi;
    const dictationApi = {
        start: jestFn(),
        push: jestFn(),
        stop: jestFn(),
        audioCapabilities: jestFn(),
    } as unknown as MockedDictationApi;
    const healthApi = {
        getHealth: jestFn(),
        checkLlm: jestFn(),
    } as unknown as MockedHealthApi;
    const jobsApi = {
        list: jestFn(),
        listActive: jestFn(),
        cancel: jestFn(),
    } as unknown as MockedJobsApi;
    const logsApi = {
        list: jestFn(),
        tail: jestFn(),
    } as unknown as MockedLogsApi;
    const metaApi = {
        getMeta: jestFn(),
    } as unknown as MockedMetaApi;
    const modelsApi = {
        list: jestFn(),
        download: jestFn(),
    } as unknown as MockedModelsApi;
    const notesApi = {
        list: jestFn(),
        getById: jestFn(),
        create: jestFn(),
        exportNote: jestFn(),
        remove: jestFn(),
    } as unknown as MockedNotesApi;
    const obsidianApi = {
        setup: jestFn(),
        bulkExport: jestFn(),
        applyLayout: jestFn(),
        detect: jestFn(),
        restHealth: jestFn(),
    } as unknown as MockedObsidianApi;
    const profilesApi = {
        list: jestFn(),
        create: jestFn(),
        update: jestFn(),
        remove: jestFn(),
        duplicate: jestFn(),
    } as unknown as MockedProfilesApi;
    const ragApi = {
        query: jestFn(),
        reindex: jestFn(),
        status: jestFn(),
    } as unknown as MockedRagApi;
    const recordingApi = {
        getAll: jestFn(),
        getById: jestFn(),
        getNotes: jestFn(),
        importFiles: jestFn(),
        importByPaths: jestFn(),
        upload: jestFn(),
        reprocess: jestFn(),
        importFromMeetily: jestFn(),
        remove: jestFn(),
    } as unknown as MockedRecordingApi;
    const settingsApi = {
        getSettings: jestFn(),
        saveSettings: jestFn(),
        checkLlm: jestFn(),
    } as unknown as MockedSettingsApi;

    const factory: ApiFactory = {
        createBackupApi: () => backupApi as unknown as BackupApi,
        createDictationApi: () => dictationApi as unknown as DictationApi,
        createHealthApi: () => healthApi as unknown as HealthApi,
        createJobsApi: () => jobsApi as unknown as JobsApi,
        createLogsApi: () => logsApi as unknown as LogsApi,
        createMetaApi: () => metaApi as unknown as MetaApi,
        createModelsApi: () => modelsApi as unknown as ModelsApi,
        createNotesApi: () => notesApi as unknown as NotesApi,
        createObsidianApi: () => obsidianApi as unknown as ObsidianApi,
        createProfilesApi: () => profilesApi as unknown as ProfilesApi,
        createRagApi: () => ragApi as unknown as RagApi,
        createRecordingApi: () => recordingApi as unknown as RecordingApi,
        createSettingsApi: () => settingsApi as unknown as SettingsApi,
    };

    return {
        factory,
        backupApi,
        dictationApi,
        healthApi,
        jobsApi,
        logsApi,
        metaApi,
        modelsApi,
        notesApi,
        obsidianApi,
        profilesApi,
        ragApi,
        recordingApi,
        settingsApi,
    };
};
