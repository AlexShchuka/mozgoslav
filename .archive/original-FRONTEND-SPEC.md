# Mozgoslav for Conversations — Frontend Specification

**По паттернам feature-based React + Redux-Saga**

---

## 1. Tech Stack (по типичный feature-based React + Redux-Saga проект)

| Что             | Технология                         | Как в feature-based референс                                                |
|-----------------|------------------------------------|-----------------------------------------------------------------------------|
| Desktop shell   | **Electron**                       | Новое (feature-based референс — SPA в браузере)                             |
| Bundler         | **Vite**                           | feature-based референс: webpack через shared-configs                        |
| UI framework    | **React 18+**                      | ✅ как в feature-based референс                                              |
| Language        | **TypeScript strict**              | ✅                                                                           |
| State           | **Redux + Redux-Saga**             | ✅ как в feature-based референс (actionCreator → reducer → saga → selectors) |
| Styling         | **styled-components**              | ✅ как в feature-based референс                                              |
| HTTP client     | **Axios**                          | ✅ как в feature-based референс (BaseApi + ApiFactory)                       |
| UI components   | **корпоративный ui-kit** или свои  | В pet-project: свои styled-components                                       |
| Routing         | **@reach/router** или React Router | feature-based референс: @reach/router                                       |
| Forms           | По месту (controlled inputs)       | Как в feature-based референс                                                |
| Tests           | **Jest + React Testing Library**   | ✅ как в feature-based референс                                              |
| Code generation | **Plop**                           | ✅ generators для features/states                                            |
| Lint            | **ESLint** (shared-configs)        | ✅                                                                           |

---

## 2. Project Structure (по паттерну типичный feature-based React + Redux-Saga проект)

```
frontend/
├── electron/                          ← Electron main process (НОВОЕ)
│   ├── main.ts
│   ├── preload.ts
│   └── utils/
│       ├── backendProcess.ts
│       └── paths.ts
│
├── src/
│   ├── index.tsx                      ← entry point
│   │
│   ├── api/                           ← HTTP layer (как в feature-based референс)
│   │   ├── BaseApi.ts                 ← Axios wrapper: get/post/put/delete
│   │   ├── apiFactory.ts             ← создание всех API классов
│   │   ├── service.ts                ← base URL resolution
│   │   ├── index.ts
│   │   ├── recording/
│   │   │   ├── RecordingApi.ts       ← CRUD для recordings
│   │   │   ├── types.ts             ← API DTOs
│   │   │   └── index.ts
│   │   ├── job/
│   │   │   ├── JobApi.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── note/
│   │   │   ├── NoteApi.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── profile/
│   │   │   ├── ProfileApi.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── settings/
│   │   │   ├── SettingsApi.ts
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   ├── hooks/                    ← API React hooks (если нужны)
│   │   │   └── useApi.ts
│   │   └── utils/
│   │       └── cache.ts
│   │
│   ├── models/                        ← доменные типы (как в feature-based референс)
│   │   ├── recording.ts              ← Recording, AudioFormat, SourceType, RecordingStatus
│   │   ├── transcript.ts             ← Transcript, TranscriptSegment
│   │   ├── processedNote.ts          ← ProcessedNote, ActionItem, ConversationType
│   │   ├── profile.ts               ← Profile, CleanupLevel
│   │   ├── job.ts                    ← ProcessingJob, JobStatus
│   │   └── settings.ts              ← AppSettings
│   │
│   ├── core/                          ← бизнес-логика без UI (как в feature-based референс)
│   │   ├── index.ts
│   │   ├── recording/
│   │   │   ├── audioFormatUtils.ts   ← поддерживаемые форматы, валидация
│   │   │   └── index.ts
│   │   ├── note/
│   │   │   ├── markdownUtils.ts      ← форматирование markdown для preview
│   │   │   └── index.ts
│   │   ├── job/
│   │   │   ├── jobStatusUtils.ts     ← isDone, isFailed, isActive, progressLabel
│   │   │   └── index.ts
│   │   ├── navigation/
│   │   │   ├── routes.ts            ← route constants
│   │   │   ├── navigate.ts          ← навигация helpers
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── time.ts              ← formatDuration, formatDate
│   │       └── index.ts
│   │
│   ├── store/                         ← Redux store (как в feature-based референс)
│   │   ├── index.ts                  ← createStore, rootReducer, rootSaga
│   │   ├── context.ts               ← React context для store
│   │   ├── sagas.ts                  ← rootSaga (fork all)
│   │   ├── utils/
│   │   │   ├── joinReducers.ts
│   │   │   └── createTypedAction.ts
│   │   │
│   │   ├── recording/               ← per-entity store slice
│   │   │   ├── actionCreator.ts     ← typed actions
│   │   │   ├── reducer.ts           ← обработка actions
│   │   │   ├── state.ts             ← RecordingState, initialState
│   │   │   ├── selectors.ts         ← selectRecordings, selectById
│   │   │   ├── saga/
│   │   │   │   ├── index.ts         ← watchRecordingSagas
│   │   │   │   ├── importRecordingsSaga.ts
│   │   │   │   └── loadRecordingsSaga.ts
│   │   │   ├── mutations.ts         ← immer-style state mutations
│   │   │   └── index.ts
│   │   │
│   │   ├── job/
│   │   │   ├── actionCreator.ts
│   │   │   ├── reducer.ts
│   │   │   ├── state.ts             ← JobState { jobs: Record<string, Job>, activeJobIds: string[] }
│   │   │   ├── selectors.ts
│   │   │   ├── saga/
│   │   │   │   ├── index.ts
│   │   │   │   ├── createJobSaga.ts
│   │   │   │   └── sseJobProgressSaga.ts  ← EventSource → dispatch updates
│   │   │   ├── mutations.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── note/
│   │   │   ├── actionCreator.ts
│   │   │   ├── reducer.ts
│   │   │   ├── state.ts
│   │   │   ├── selectors.ts
│   │   │   ├── saga/
│   │   │   │   ├── index.ts
│   │   │   │   ├── loadNotesSaga.ts
│   │   │   │   ├── reprocessNoteSaga.ts
│   │   │   │   └── exportNoteSaga.ts
│   │   │   ├── mutations.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── profile/
│   │   │   ├── actionCreator.ts
│   │   │   ├── reducer.ts
│   │   │   ├── state.ts
│   │   │   ├── selectors.ts
│   │   │   ├── saga/
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── settings/
│   │   │   ├── actionCreator.ts
│   │   │   ├── reducer.ts
│   │   │   ├── state.ts
│   │   │   ├── selectors.ts
│   │   │   ├── saga/
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── ui/                       ← UI state (sidebar, modals, etc.)
│   │   │   ├── actionCreator.ts
│   │   │   ├── reducer.ts
│   │   │   ├── state.ts
│   │   │   ├── selectors.ts
│   │   │   ├── saga/
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   │
│   │   └── error/                    ← global error handling
│   │       ├── actionCreators.ts
│   │       ├── reducer.ts
│   │       ├── state.ts
│   │       ├── selector.ts
│   │       ├── mutations.ts
│   │       └── index.ts
│   │
│   ├── features/                      ← feature-based UI (как в feature-based референс)
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.tsx         ← presentational component
│   │   │   ├── Dashboard.style.ts    ← styled-components
│   │   │   ├── Dashboard.container.ts ← connect(mapState, mapDispatch)
│   │   │   ├── types.ts
│   │   │   ├── index.ts
│   │   │   ├── RecordingList/
│   │   │   │   ├── RecordingList.tsx
│   │   │   │   ├── RecordingList.style.ts
│   │   │   │   ├── RecordingList.container.ts
│   │   │   │   └── types.ts
│   │   │   ├── ImportDropzone/
│   │   │   │   ├── ImportDropzone.tsx
│   │   │   │   ├── ImportDropzone.style.ts
│   │   │   │   └── types.ts
│   │   │   └── RecordButton/
│   │   │       ├── RecordButton.tsx
│   │   │       ├── RecordButton.style.ts
│   │   │       └── types.ts
│   │   │
│   │   ├── Queue/
│   │   │   ├── Queue.tsx
│   │   │   ├── Queue.style.ts
│   │   │   ├── Queue.container.ts
│   │   │   ├── types.ts
│   │   │   ├── index.ts
│   │   │   ├── JobCard/
│   │   │   │   ├── JobCard.tsx
│   │   │   │   ├── JobCard.style.ts
│   │   │   │   └── types.ts
│   │   │   └── JobProgress/
│   │   │       ├── JobProgress.tsx
│   │   │       └── JobProgress.style.ts
│   │   │
│   │   ├── NoteViewer/
│   │   │   ├── NoteViewer.tsx
│   │   │   ├── NoteViewer.style.ts
│   │   │   ├── NoteViewer.container.ts
│   │   │   ├── types.ts
│   │   │   ├── index.ts
│   │   │   ├── MarkdownRenderer/
│   │   │   │   ├── MarkdownRenderer.tsx
│   │   │   │   └── MarkdownRenderer.style.ts
│   │   │   ├── NoteActions/
│   │   │   │   ├── NoteActions.tsx
│   │   │   │   ├── NoteActions.style.ts
│   │   │   │   └── NoteActions.container.ts
│   │   │   └── ProfilePicker/
│   │   │       ├── ProfilePicker.tsx
│   │   │       └── ProfilePicker.style.ts
│   │   │
│   │   ├── Profiles/
│   │   │   ├── Profiles.tsx
│   │   │   ├── Profiles.container.ts
│   │   │   ├── ProfileEditor/
│   │   │   │   ├── ProfileEditor.tsx
│   │   │   │   ├── ProfileEditor.style.ts
│   │   │   │   └── types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── Settings/
│   │   │   ├── Settings.tsx
│   │   │   ├── Settings.style.ts
│   │   │   ├── Settings.container.ts
│   │   │   ├── LlmHealthCheck/
│   │   │   │   └── LlmHealthCheck.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── Layout/
│   │       ├── Layout.tsx
│   │       ├── Layout.style.ts
│   │       ├── Sidebar/
│   │       │   ├── Sidebar.tsx
│   │       │   └── Sidebar.style.ts
│   │       └── index.ts
│   │
│   ├── components/                    ← shared UI components (как в feature-based референс)
│   │   ├── Modal/
│   │   │   ├── Modal.tsx
│   │   │   └── Modal.style.ts
│   │   ├── Preloader/
│   │   │   └── Preloader.tsx
│   │   ├── Select/
│   │   │   ├── Select.tsx
│   │   │   ├── Select.style.ts
│   │   │   └── hooks/
│   │   │       └── useSelectState.ts
│   │   ├── ProgressBar/
│   │   │   ├── ProgressBar.tsx
│   │   │   └── ProgressBar.style.ts
│   │   ├── Badge/
│   │   │   ├── Badge.tsx
│   │   │   └── Badge.style.ts
│   │   ├── FileDropzone/
│   │   │   ├── FileDropzone.tsx
│   │   │   └── FileDropzone.style.ts
│   │   └── AudioPlayer/
│   │       ├── AudioPlayer.tsx
│   │       └── AudioPlayer.style.ts
│   │
│   ├── hooks/                         ← global hooks (как в feature-based референс)
│   │   ├── useAnimation.ts
│   │   ├── useHover.ts
│   │   ├── useIsMountedRef.ts
│   │   ├── useQueryParams.ts
│   │   ├── __tests__/
│   │   └── permissions/
│   │       └── usePermissions.ts
│   │
│   ├── constants/                     ← (как в feature-based референс)
│   │   ├── routes.ts
│   │   ├── audioFormats.ts
│   │   └── jobStatuses.ts
│   │
│   ├── guards/                        ← route guards (если нужно)
│   │
│   ├── localization/                  ← i18n (если нужно)
│   │
│   ├── types/                         ← global utility types
│   │   └── utilityTypes.ts
│   │
│   ├── testUtils/                     ← test helpers (как в feature-based референс)
│   │   ├── renderWithStore.tsx
│   │   └── mockApi.ts
│   │
│   └── styles/
│       └── theme.ts                  ← styled-components ThemeProvider
│
├── plop-templates/                    ← Plop generators (как в feature-based референс)
│   ├── feature/
│   │   ├── Component.tsx.hbs
│   │   ├── Component.style.ts.hbs
│   │   ├── Component.container.ts.hbs
│   │   ├── types.ts.hbs
│   │   └── index.ts.hbs
│   └── state/
│       ├── actionCreator.ts.hbs
│       ├── reducer.ts.hbs
│       ├── state.ts.hbs
│       ├── selectors.ts.hbs
│       ├── mutations.ts.hbs
│       └── index.ts.hbs
│
├── types/                             ← ambient type declarations
│   └── global.d.ts
│
├── package.json
├── tsconfig.json
├── plopfile.js
├── jest.config.js
├── postcss.config.js
├── stylelint.config.js
├── .eslintrc.js
├── commitlint.config.js
├── lefthook.yml
├── electron-builder.yml
└── vite.config.ts
```

---

## 3. Паттерны (из типичный feature-based React + Redux-Saga проект)

### 3.1 Component Pattern: Presentational + Container

Каждый feature-компонент разделён на 3 файла:

**Component.tsx** — чистый presentational, получает props, рендерит UI:

```typescript
import React, { FC } from "react";
import { DashboardProps } from "./types";
import { DashboardContainer, StatsSection } from "./Dashboard.style";
import RecordingList from "./RecordingList";
import ImportDropzone from "./ImportDropzone";

const Dashboard: FC<DashboardProps> = ({
  recordings,
  isLoading,
  onImport,
  onRecordingClick,
}) => {
  return (
    <DashboardContainer>
      <ImportDropzone onImport={onImport} />
      <RecordingList
        recordings={recordings}
        isLoading={isLoading}
        onItemClick={onRecordingClick}
      />
    </DashboardContainer>
  );
};

export default Dashboard;
```

**Component.container.ts** — connect к Redux store:

```typescript
import { connect } from "react-redux";
import { Dispatch, bindActionCreators } from "redux";
import Dashboard from "./Dashboard";
import { GlobalState } from "../../store";
import { selectAllRecordings, selectIsLoading } from "../../store/recording/selectors";
import { importRecordings } from "../../store/recording/actionCreator";
import { navigate } from "../../core/navigation";

const mapStateToProps = (state: GlobalState) => ({
  recordings: selectAllRecordings(state),
  isLoading: selectIsLoading(state),
});

const mapDispatchToProps = (dispatch: Dispatch) =>
  bindActionCreators(
    {
      onImport: importRecordings.createAction,
    },
    dispatch
  );

type StateProps = ReturnType<typeof mapStateToProps>;
type DispatchProps = ReturnType<typeof mapDispatchToProps>;

const mergeProps = (stateProps: StateProps, dispatchProps: DispatchProps) => ({
  ...stateProps,
  ...dispatchProps,
  onRecordingClick: (id: string) => navigate.toNote(id),
});

export default connect(mapStateToProps, mapDispatchToProps, mergeProps)(Dashboard);
```

**Component.style.ts** — styled-components:

```typescript
import styled from "styled-components";

export const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
`;

export const StatsSection = styled.div`
  display: flex;
  gap: 16px;
`;
```

**types.ts** — props interface:

```typescript
import { Recording } from "../../models/recording";

export interface DashboardProps {
  recordings: Recording[];
  isLoading: boolean;
  onImport: (files: File[]) => void;
  onRecordingClick: (id: string) => void;
}
```

### 3.2 Store Slice Pattern (Redux)

Каждый store slice состоит из:

**state.ts:**

```typescript
import { Recording } from "../../models/recording";

export type RecordingState = {
  recordings: Record<string, Recording>;
  isLoading: boolean;
  error: string | null;
};

export const initialState: RecordingState = {
  recordings: {},
  isLoading: false,
  error: null,
};
```

**actionCreator.ts:**

```typescript
import { createTypedAction } from "../utils/createTypedAction";
import { Recording } from "../../models/recording";

export const loadRecordings = createTypedAction<void>("recording/LOAD");
export const loadRecordingsSuccess = createTypedAction<Recording[]>("recording/LOAD_SUCCESS");
export const loadRecordingsFailure = createTypedAction<string>("recording/LOAD_FAILURE");

export const importRecordings = createTypedAction<File[]>("recording/IMPORT");
export const importRecordingsSuccess = createTypedAction<Recording[]>("recording/IMPORT_SUCCESS");
```

**reducer.ts:**

```typescript
import { joinReducers } from "../utils";
import * as mutations from "./mutations";
import { loadRecordings, loadRecordingsSuccess, loadRecordingsFailure, importRecordingsSuccess } from "./actionCreator";
import { RecordingState, initialState } from "./state";

const loadReducer = loadRecordings.createReducer<RecordingState>(
  (state) => mutations.setLoading(true)(state),
  initialState
);

const loadSuccessReducer = loadRecordingsSuccess.createReducer<RecordingState>(
  (state, action) => mutations.setRecordings(action.payload)(state),
  initialState
);

export default joinReducers([loadReducer, loadSuccessReducer, ...]);
```

**mutations.ts** (immer-style):

```typescript
import { RecordingState } from "./state";
import { Recording } from "../../models/recording";

export const setLoading = (isLoading: boolean) => (state: RecordingState): RecordingState => ({
  ...state,
  isLoading,
});

export const setRecordings = (recordings: Recording[]) => (state: RecordingState): RecordingState => ({
  ...state,
  recordings: Object.fromEntries(recordings.map(r => [r.id, r])),
  isLoading: false,
  error: null,
});
```

**selectors.ts:**

```typescript
import { GlobalState } from "../index";
import { createSelector } from "reselect";

const selectRecordingState = (state: GlobalState) => state.recording;

export const selectAllRecordings = createSelector(
  selectRecordingState,
  (state) => Object.values(state.recordings)
);

export const selectIsLoading = createSelector(
  selectRecordingState,
  (state) => state.isLoading
);

export const selectRecordingById = (id: string) => createSelector(
  selectRecordingState,
  (state) => state.recordings[id]
);
```

**saga/importRecordingsSaga.ts:**

```typescript
import { call, put, takeLatest } from "redux-saga/effects";
import { importRecordings, importRecordingsSuccess } from "../actionCreator";
import { apiFactory } from "../../api";

function* importRecordingsSaga(action: ReturnType<typeof importRecordings.createAction>) {
  try {
    const api = apiFactory.createRecordingApi(getClient());
    const response = yield call([api, api.import], action.payload);
    yield put(importRecordingsSuccess.createAction(response.data.recordings));
  } catch (error) {
  }
}

export function* watchImportRecordings() {
  yield takeLatest(importRecordings.type, importRecordingsSaga);
}
```

### 3.3 API Pattern (BaseApi + Factory)

**BaseApi.ts:**

```typescript
import { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export type ApiReturnType<T = any> = Promise<AxiosResponse<T>>;

class BaseApi {
  private readonly client: AxiosInstance;
  private readonly defaultConfig: AxiosRequestConfig;

  constructor(client: AxiosInstance, baseURL: string) {
    this.client = client;
    this.defaultConfig = { baseURL };
  }

  protected get<T = any>(url: string, config?: AxiosRequestConfig): ApiReturnType<T> {
    return this.client.get<T>(url, { ...this.defaultConfig, ...config });
  }

  protected post<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): ApiReturnType<T> {
    return this.client.post<T>(url, data, { ...this.defaultConfig, ...config });
  }

  protected put<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): ApiReturnType<T> {
    return this.client.put<T>(url, data, { ...this.defaultConfig, ...config });
  }
}

export default BaseApi;
```

**RecordingApi.ts:**

```typescript
import BaseApi from "../BaseApi";
import { RecordingDto, ImportResponseDto } from "./types";

export class RecordingApi extends BaseApi {
  async getAll(): Promise<RecordingDto[]> {
    const response = await this.get<RecordingDto[]>("/api/recordings");
    return response.data;
  }

  async getById(id: string): Promise<RecordingDto> {
    const response = await this.get<RecordingDto>(`/api/recordings/${id}`);
    return response.data;
  }

  async import(files: File[]): Promise<ImportResponseDto> {
    const form = new FormData();
    files.forEach(f => form.append("files", f));
    const response = await this.post<ImportResponseDto>("/api/recordings/import", form);
    return response.data;
  }
}
```

**apiFactory.ts:**

```typescript
import { AxiosInstance } from "axios";
import { RecordingApi } from "./recording";
import { JobApi } from "./job";
import { NoteApi } from "./note";
import { ProfileApi } from "./profile";
import { SettingsApi } from "./settings";

const BACKEND_URL = "http://localhost:5050";

export interface ApiFactory {
  createRecordingApi(client: AxiosInstance): RecordingApi;
  createJobApi(client: AxiosInstance): JobApi;
  createNoteApi(client: AxiosInstance): NoteApi;
  createProfileApi(client: AxiosInstance): ProfileApi;
  createSettingsApi(client: AxiosInstance): SettingsApi;
}

const apiFactory: ApiFactory = {
  createRecordingApi: (client) => new RecordingApi(client, BACKEND_URL),
  createJobApi: (client) => new JobApi(client, BACKEND_URL),
  createNoteApi: (client) => new NoteApi(client, BACKEND_URL),
  createProfileApi: (client) => new ProfileApi(client, BACKEND_URL),
  createSettingsApi: (client) => new SettingsApi(client, BACKEND_URL),
};

export default apiFactory;
```

### 3.4 SSE (Job Progress) через Saga

```typescript
import { eventChannel, END } from "redux-saga";
import { take, put, call } from "redux-saga/effects";
import { updateJobProgress } from "../actionCreator";

function createSSEChannel(url: string) {
  return eventChannel(emit => {
    const es = new EventSource(url);
    es.onmessage = (event) => emit(JSON.parse(event.data));
    es.onerror = () => { es.close(); emit(END); };
    return () => es.close();
  });
}

export function* sseJobProgressSaga() {
  const channel = yield call(createSSEChannel, "http://localhost:5050/api/jobs/stream");
  try {
    while (true) {
      const job = yield take(channel);
      yield put(updateJobProgress.createAction(job));
    }
  } finally {
  }
}
```

---

## 4. Models (доменные типы)

```typescript
export type AudioFormat = "Mp3" | "M4a" | "Wav" | "Mp4" | "Ogg" | "Flac" | "Webm" | "Aac";
export type SourceType = "Recorded" | "Imported";
export type RecordingStatus = "New" | "Transcribing" | "Transcribed" | "Failed";

export interface Recording {
  id: string;
  fileName: string;
  filePath: string;
  sha256: string;
  duration: string;
  format: AudioFormat;
  sourceType: SourceType;
  status: RecordingStatus;
  createdAt: string;
}

export type JobStatus = "Queued" | "Transcribing" | "Correcting" | "Summarizing" | "Exporting" | "Done" | "Failed";

export interface ProcessingJob {
  id: string;
  recordingId: string;
  profileId: string;
  status: JobStatus;
  progress: number;
  currentStep: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export type ConversationType = "Meeting" | "OneOnOne" | "Idea" | "Personal" | "Other";

export interface ActionItem {
  person: string;
  task: string;
  deadline: string | null;
}

export interface ProcessedNote {
  id: string;
  transcriptId: string;
  profileId: string;
  version: number;
  summary: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  unresolvedQuestions: string[];
  participants: string[];
  topic: string;
  conversationType: ConversationType;
  cleanTranscript: string;
  fullTranscript: string;
  tags: string[];
  markdownContent: string;
  exportedToVault: boolean;
  vaultPath: string | null;
  createdAt: string;
}

export type CleanupLevel = "None" | "Light" | "Aggressive";

export interface Profile {
  id: string;
  name: string;
  systemPrompt: string;
  outputTemplate: string;
  cleanupLevel: CleanupLevel;
  exportFolder: string;
  autoTags: string[];
  isDefault: boolean;
  isBuiltIn: boolean;
}
```

---

## 5. Testing (по feature-based референс)

### Подход

- **Jest** (не Vitest) — как в feature-based референс
- **React Testing Library** для компонентов
- **redux-saga-test-plan** для saga тестов
- Тесты рядом с кодом: `__tests__/` папки внутри features/store

### Пример saga test:

```typescript
import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { importRecordingsSaga } from "../importRecordingsSaga";
import { importRecordings, importRecordingsSuccess } from "../../actionCreator";

describe("importRecordingsSaga", () => {
  it("dispatches success on import", () => {
    const files = [new File([""], "test.m4a")];
    const mockRecordings = [{ id: "1", fileName: "test.m4a" }];

    return expectSaga(importRecordingsSaga, importRecordings.createAction(files))
      .provide([[matchers.call.fn(api.import), { data: { recordings: mockRecordings } }]])
      .put(importRecordingsSuccess.createAction(mockRecordings))
      .run();
  });
});
```

### Пример component test:

```typescript
import { render, screen } from "@testing-library/react";
import Dashboard from "../Dashboard";

describe("Dashboard", () => {
  it("renders recording list", () => {
    render(
      <Dashboard
        recordings={[{ id: "1", fileName: "test.m4a", status: "Transcribed" }]}
        isLoading={false}
        onImport={jest.fn()}
        onRecordingClick={jest.fn()}
      />
    );
    expect(screen.getByText("test.m4a")).toBeInTheDocument();
  });
});
```

---

## 6. Code Style (из типичный feature-based React + Redux-Saga проект)

- **FC** (FunctionComponent) для компонентов, не arrow function с explicit return type
- **default export** для компонентов и containers (как в feature-based референс)
- **named export** для utilities, types, selectors
- **Папка на компонент**: Component.tsx + Component.style.ts + Component.container.ts + types.ts + index.ts
- **Hooks**: `use` prefix, отдельные файлы, `hooks/` папка
- **Selectors**: reselect `createSelector`, мемоизированные
- **Actions**: typed action creators через утилиту `createTypedAction`
- **Mutations**: чистые функции (state) => state, composable через compose
- **No inline styles** — только styled-components
- **No CSS modules** — styled-components
- **barrel exports**: index.ts в каждой папке
- **Plop**: генератор для новых features и store slices

---

## 7. Electron Layer (НОВОЕ, не из feature-based референс)

```typescript
import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { startBackend, stopBackend } from "./utils/backendProcess";
import path from "path";

let mainWindow: BrowserWindow | null = null;

app.on("ready", async () => {
  await startBackend();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  ipcMain.handle("dialog:openFile", async () => {
    return dialog.showOpenDialog({
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audio", extensions: ["mp3", "m4a", "wav", "mp4", "ogg", "flac"] }],
    });
  });

  ipcMain.handle("dialog:openFolder", async () => {
    return dialog.showOpenDialog({ properties: ["openDirectory"] });
  });
});

app.on("before-quit", () => stopBackend());
app.on("window-all-closed", () => app.quit());
```

---

## 8. Key Decisions (Frontend)

1. **Redux + Saga, не Zustand** — как в feature-based референс, знакомо команде
2. **styled-components, не Tailwind** — как в feature-based референс
3. **Axios, не fetch** — BaseApi + ApiFactory как в feature-based референс
4. **Container/Presentational** — connect() pattern как в feature-based референс
5. **Feature-based structure** — features/Dashboard/, features/Queue/ и т.д.
6. **Plop generators** — scaffolding новых features и store slices
7. **Jest, не Vitest** — как в feature-based референс
8. **SSE через redux-saga eventChannel** — real-time updates из backend
9. **Electron** — desktop shell, startBackend() при запуске
10. **Types in models/** — доменные типы отдельно от API DTOs
