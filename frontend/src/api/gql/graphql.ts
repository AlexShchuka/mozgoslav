/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
  /** The `DateTime` scalar represents an ISO-8601 compliant date time type. */
  DateTime: { input: string; output: string };
  /** The `Long` scalar type represents non-fractional signed whole 64-bit numeric values. Long can represent values between -(2^63) and 2^63 - 1. */
  Long: { input: any; output: any };
  /** The `TimeSpan` scalar represents an ISO-8601 compliant duration type. */
  TimeSpan: { input: any; output: any };
  UUID: { input: string; output: string };
};

export type AcceptSyncDevicePayload = {
  __typename?: "AcceptSyncDevicePayload";
  accepted: Scalars["Boolean"]["output"];
  errors: Array<IUserError>;
};

export type ActionItem = {
  __typename?: "ActionItem";
  deadline?: Maybe<Scalars["String"]["output"]>;
  person: Scalars["String"]["output"];
  task: Scalars["String"]["output"];
};

export type ActionItemFilterInput = {
  and?: InputMaybe<Array<ActionItemFilterInput>>;
  deadline?: InputMaybe<StringOperationFilterInput>;
  or?: InputMaybe<Array<ActionItemFilterInput>>;
  person?: InputMaybe<StringOperationFilterInput>;
  task?: InputMaybe<StringOperationFilterInput>;
};

export type AppSettingsDto = {
  __typename?: "AppSettingsDto";
  actionsSkillEnabled: Scalars["Boolean"]["output"];
  claudeCliPath: Scalars["String"]["output"];
  dictationAppProfiles: Array<KeyValuePairOfStringAndString>;
  dictationCaptureSampleRate: Scalars["Int"]["output"];
  dictationClassifyIntentEnabled: Scalars["Boolean"]["output"];
  dictationDumpEnabled: Scalars["Boolean"]["output"];
  dictationDumpHotkeyHold: Scalars["String"]["output"];
  dictationDumpHotkeyToggle: Scalars["String"]["output"];
  dictationEnabled: Scalars["Boolean"]["output"];
  dictationHotkeyType: Scalars["String"]["output"];
  dictationInjectMode: Scalars["String"]["output"];
  dictationKeyboardHotkey: Scalars["String"]["output"];
  dictationLanguage: Scalars["String"]["output"];
  dictationLlmPolish: Scalars["Boolean"]["output"];
  dictationModelUnloadMinutes: Scalars["Int"]["output"];
  dictationMouseButton: Scalars["Int"]["output"];
  dictationOverlayEnabled: Scalars["Boolean"]["output"];
  dictationOverlayPosition: Scalars["String"]["output"];
  dictationPushToTalk: Scalars["Boolean"]["output"];
  dictationSoundFeedback: Scalars["Boolean"]["output"];
  dictationTempAudioPath: Scalars["String"]["output"];
  dictationVocabulary: Array<Scalars["String"]["output"]>;
  dictationWhisperModelId: Scalars["String"]["output"];
  language: Scalars["String"]["output"];
  llmApiKey: Scalars["String"]["output"];
  llmEndpoint: Scalars["String"]["output"];
  llmModel: Scalars["String"]["output"];
  llmProvider: Scalars["String"]["output"];
  mcpServerEnabled: Scalars["Boolean"]["output"];
  mcpServerPort: Scalars["Int"]["output"];
  mcpServerToken: Scalars["String"]["output"];
  obsidianApiHost: Scalars["String"]["output"];
  obsidianApiToken: Scalars["String"]["output"];
  obsidianBootstrapPins: Scalars["String"]["output"];
  obsidianFeatureEnabled: Scalars["Boolean"]["output"];
  remindersSkillEnabled: Scalars["Boolean"]["output"];
  sidecarEnrichmentEnabled: Scalars["Boolean"]["output"];
  syncthingApiKey: Scalars["String"]["output"];
  syncthingBaseUrl: Scalars["String"]["output"];
  syncthingEnabled: Scalars["Boolean"]["output"];
  syncthingObsidianVaultPath: Scalars["String"]["output"];
  themeMode: Scalars["String"]["output"];
  vadModelPath: Scalars["String"]["output"];
  vaultPath: Scalars["String"]["output"];
  webCacheTtlHours: Scalars["Int"]["output"];
  whisperModelPath: Scalars["String"]["output"];
  whisperThreads: Scalars["Int"]["output"];
};

export type AudioDeviceChangedEvent = {
  __typename?: "AudioDeviceChangedEvent";
  devices: Array<AudioDeviceEntry>;
  kind: Scalars["String"]["output"];
  observedAt: Scalars["DateTime"]["output"];
};

export type AudioDeviceEntry = {
  __typename?: "AudioDeviceEntry";
  id: Scalars["String"]["output"];
  isDefault: Scalars["Boolean"]["output"];
  name: Scalars["String"]["output"];
};

export enum AudioFormat {
  Aac = "AAC",
  Flac = "FLAC",
  M4A = "M4A",
  Mp3 = "MP3",
  Mp4 = "MP4",
  Ogg = "OGG",
  Wav = "WAV",
  Webm = "WEBM",
}

export type AudioFormatOperationFilterInput = {
  eq?: InputMaybe<AudioFormat>;
  in?: InputMaybe<Array<AudioFormat>>;
  neq?: InputMaybe<AudioFormat>;
  nin?: InputMaybe<Array<AudioFormat>>;
};

export type BackupEntry = {
  __typename?: "BackupEntry";
  createdAt: Scalars["DateTime"]["output"];
  name: Scalars["String"]["output"];
  path: Scalars["String"]["output"];
  sizeBytes: Scalars["Long"]["output"];
};

export type BooleanOperationFilterInput = {
  eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  neq?: InputMaybe<Scalars["Boolean"]["input"]>;
};

export type BootstrapDriftCheck = {
  __typename?: "BootstrapDriftCheck";
  actions: Array<DiagnosticAction>;
  code: Scalars["String"]["output"];
  files: Array<BootstrapFileDrift>;
  message: Scalars["String"]["output"];
  ok: Scalars["Boolean"]["output"];
  severity: CheckSeverity;
};

export enum BootstrapDriftStatus {
  Extra = "EXTRA",
  Missing = "MISSING",
  Ok = "OK",
  Outdated = "OUTDATED",
  UserModified = "USER_MODIFIED",
}

export type BootstrapFileDrift = {
  __typename?: "BootstrapFileDrift";
  actualSha256?: Maybe<Scalars["String"]["output"]>;
  expectedSha256: Scalars["String"]["output"];
  status: BootstrapDriftStatus;
  vaultRelativePath: Scalars["String"]["output"];
};

export type CancelJobPayload = {
  __typename?: "CancelJobPayload";
  errors: Array<IUserError>;
};

export enum CheckSeverity {
  Advisory = "ADVISORY",
  Error = "ERROR",
  Ok = "OK",
  Warning = "WARNING",
}

export enum CleanupLevel {
  Aggressive = "AGGRESSIVE",
  Light = "LIGHT",
  None = "NONE",
}

export type ConflictError = IUserError & {
  __typename?: "ConflictError";
  code: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
};

export enum ConversationType {
  Idea = "IDEA",
  Meeting = "MEETING",
  OneOnOne = "ONE_ON_ONE",
  Other = "OTHER",
  Personal = "PERSONAL",
}

export type ConversationTypeOperationFilterInput = {
  eq?: InputMaybe<ConversationType>;
  in?: InputMaybe<Array<ConversationType>>;
  neq?: InputMaybe<ConversationType>;
  nin?: InputMaybe<Array<ConversationType>>;
};

export type CreateBackupPayload = {
  __typename?: "CreateBackupPayload";
  backup?: Maybe<BackupEntry>;
  errors: Array<IUserError>;
};

export type CreateNoteInput = {
  body?: InputMaybe<Scalars["String"]["input"]>;
  title: Scalars["String"]["input"];
};

export type CreateProfileInput = {
  autoTags: Array<Scalars["String"]["input"]>;
  cleanupLevel: CleanupLevel;
  exportFolder: Scalars["String"]["input"];
  glossaryByLanguage: Array<GlossaryEntryInput>;
  isDefault: Scalars["Boolean"]["input"];
  llmCorrectionEnabled: Scalars["Boolean"]["input"];
  llmModelOverride?: Scalars["String"]["input"];
  llmProviderOverride?: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
  outputTemplate: Scalars["String"]["input"];
  systemPrompt: Scalars["String"]["input"];
};

export type DateTimeOperationFilterInput = {
  eq?: InputMaybe<Scalars["DateTime"]["input"]>;
  gt?: InputMaybe<Scalars["DateTime"]["input"]>;
  gte?: InputMaybe<Scalars["DateTime"]["input"]>;
  in?: InputMaybe<Array<InputMaybe<Scalars["DateTime"]["input"]>>>;
  lt?: InputMaybe<Scalars["DateTime"]["input"]>;
  lte?: InputMaybe<Scalars["DateTime"]["input"]>;
  neq?: InputMaybe<Scalars["DateTime"]["input"]>;
  ngt?: InputMaybe<Scalars["DateTime"]["input"]>;
  ngte?: InputMaybe<Scalars["DateTime"]["input"]>;
  nin?: InputMaybe<Array<InputMaybe<Scalars["DateTime"]["input"]>>>;
  nlt?: InputMaybe<Scalars["DateTime"]["input"]>;
  nlte?: InputMaybe<Scalars["DateTime"]["input"]>;
};

export type DeviceConnectionPayload = {
  __typename?: "DeviceConnectionPayload";
  address?: Maybe<Scalars["String"]["output"]>;
  connected: Scalars["Boolean"]["output"];
  deviceId: Scalars["String"]["output"];
  error?: Maybe<Scalars["String"]["output"]>;
};

export enum DiagnosticAction {
  OpenLmStudioHelp = "OPEN_LM_STUDIO_HELP",
  OpenOnboarding = "OPEN_ONBOARDING",
  OpenSettings = "OPEN_SETTINGS",
  ReapplyBootstrap = "REAPPLY_BOOTSTRAP",
  RefreshRestToken = "REFRESH_REST_TOKEN",
  ReinstallPlugins = "REINSTALL_PLUGINS",
}

export type DictationAudioCapabilities = {
  __typename?: "DictationAudioCapabilities";
  detectedPlatform: Scalars["String"]["output"];
  isSupported: Scalars["Boolean"]["output"];
  permissionsRequired: Array<Scalars["String"]["output"]>;
};

export type DictationCancelPayload = {
  __typename?: "DictationCancelPayload";
  errors: Array<IUserError>;
};

export type DictationPartialEvent = {
  __typename?: "DictationPartialEvent";
  sessionId: Scalars["UUID"]["output"];
  text: Scalars["String"]["output"];
  timestampMs: Scalars["Float"]["output"];
};

export type DictationSessionStatus = {
  __typename?: "DictationSessionStatus";
  sessionId: Scalars["UUID"]["output"];
  source?: Maybe<Scalars["String"]["output"]>;
  startedAt: Scalars["DateTime"]["output"];
  state: Scalars["String"]["output"];
};

export type DictationStartPayload = {
  __typename?: "DictationStartPayload";
  errors: Array<IUserError>;
  sessionId?: Maybe<Scalars["UUID"]["output"]>;
  source?: Maybe<Scalars["String"]["output"]>;
};

export type DictationStopPayload = {
  __typename?: "DictationStopPayload";
  durationMs?: Maybe<Scalars["Float"]["output"]>;
  errors: Array<IUserError>;
  polishedText?: Maybe<Scalars["String"]["output"]>;
  rawText?: Maybe<Scalars["String"]["output"]>;
};

export type DownloadModelPayload = {
  __typename?: "DownloadModelPayload";
  downloadId?: Maybe<Scalars["String"]["output"]>;
  errors: Array<IUserError>;
};

export type EnqueueJobInput = {
  profileId: Scalars["UUID"]["input"];
  recordingId: Scalars["UUID"]["input"];
};

export type FileConflictPayload = {
  __typename?: "FileConflictPayload";
  folder: Scalars["String"]["output"];
  path: Scalars["String"]["output"];
};

export type FolderCompletionPayload = {
  __typename?: "FolderCompletionPayload";
  completion: Scalars["Float"]["output"];
  device: Scalars["String"]["output"];
  folder: Scalars["String"]["output"];
  globalBytes: Scalars["Long"]["output"];
  needBytes: Scalars["Long"]["output"];
};

export type GlossaryEntry = {
  __typename?: "GlossaryEntry";
  language: Scalars["String"]["output"];
  terms: Array<Scalars["String"]["output"]>;
};

export type GlossaryEntryInput = {
  language: Scalars["String"]["input"];
  terms: Array<Scalars["String"]["input"]>;
};

export type HealthStatus = {
  __typename?: "HealthStatus";
  status: Scalars["String"]["output"];
  time: Scalars["String"]["output"];
};

export type HotkeyEventMessage = {
  __typename?: "HotkeyEventMessage";
  accelerator: Scalars["String"]["output"];
  kind: Scalars["String"]["output"];
  observedAt: Scalars["DateTime"]["output"];
};

export type IUserError = {
  code: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
};

export type ImportRecordingsInput = {
  filePaths: Array<Scalars["String"]["input"]>;
  profileId?: InputMaybe<Scalars["UUID"]["input"]>;
};

export type ImportRecordingsPayload = {
  __typename?: "ImportRecordingsPayload";
  errors: Array<IUserError>;
  recordings: Array<Recording>;
};

export type IntOperationFilterInput = {
  eq?: InputMaybe<Scalars["Int"]["input"]>;
  gt?: InputMaybe<Scalars["Int"]["input"]>;
  gte?: InputMaybe<Scalars["Int"]["input"]>;
  in?: InputMaybe<Array<InputMaybe<Scalars["Int"]["input"]>>>;
  lt?: InputMaybe<Scalars["Int"]["input"]>;
  lte?: InputMaybe<Scalars["Int"]["input"]>;
  neq?: InputMaybe<Scalars["Int"]["input"]>;
  ngt?: InputMaybe<Scalars["Int"]["input"]>;
  ngte?: InputMaybe<Scalars["Int"]["input"]>;
  nin?: InputMaybe<Array<InputMaybe<Scalars["Int"]["input"]>>>;
  nlt?: InputMaybe<Scalars["Int"]["input"]>;
  nlte?: InputMaybe<Scalars["Int"]["input"]>;
};

export type JobPayload = {
  __typename?: "JobPayload";
  errors: Array<IUserError>;
  job?: Maybe<ProcessingJob>;
};

export enum JobStage {
  Correcting = "CORRECTING",
  Exporting = "EXPORTING",
  LlmCorrection = "LLM_CORRECTION",
  Summarizing = "SUMMARIZING",
  Transcribing = "TRANSCRIBING",
}

export enum JobStatus {
  Cancelled = "CANCELLED",
  Correcting = "CORRECTING",
  Done = "DONE",
  Exporting = "EXPORTING",
  Failed = "FAILED",
  Paused = "PAUSED",
  PreflightChecks = "PREFLIGHT_CHECKS",
  Queued = "QUEUED",
  Summarizing = "SUMMARIZING",
  Transcribing = "TRANSCRIBING",
}

export type JobStatusOperationFilterInput = {
  eq?: InputMaybe<JobStatus>;
  in?: InputMaybe<Array<JobStatus>>;
  neq?: InputMaybe<JobStatus>;
  nin?: InputMaybe<Array<JobStatus>>;
};

/** A connection to a list of items. */
export type JobsConnection = {
  __typename?: "JobsConnection";
  /** A list of edges. */
  edges?: Maybe<Array<JobsEdge>>;
  /** A flattened list of the nodes. */
  nodes?: Maybe<Array<ProcessingJob>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars["Int"]["output"];
};

/** An edge in a connection. */
export type JobsEdge = {
  __typename?: "JobsEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ProcessingJob;
};

export type KeyValuePairOfStringAndListOfString = {
  __typename?: "KeyValuePairOfStringAndListOfString";
  key: Scalars["String"]["output"];
  value: Array<Scalars["String"]["output"]>;
};

export type KeyValuePairOfStringAndString = {
  __typename?: "KeyValuePairOfStringAndString";
  key: Scalars["String"]["output"];
  value: Scalars["String"]["output"];
};

export type KeyValuePairOfStringAndStringInput = {
  key: Scalars["String"]["input"];
  value: Scalars["String"]["input"];
};

export type ListFilterInputTypeOfActionItemFilterInput = {
  all?: InputMaybe<ActionItemFilterInput>;
  any?: InputMaybe<Scalars["Boolean"]["input"]>;
  none?: InputMaybe<ActionItemFilterInput>;
  some?: InputMaybe<ActionItemFilterInput>;
};

export type ListStringOperationFilterInput = {
  all?: InputMaybe<StringOperationFilterInput>;
  any?: InputMaybe<Scalars["Boolean"]["input"]>;
  none?: InputMaybe<StringOperationFilterInput>;
  some?: InputMaybe<StringOperationFilterInput>;
};

export type LlmCapabilities = {
  __typename?: "LlmCapabilities";
  ctxLength: Scalars["Int"]["output"];
  probedAt: Scalars["DateTime"]["output"];
  supportsJsonMode: Scalars["Boolean"]["output"];
  supportsToolCalling: Scalars["Boolean"]["output"];
  tokensPerSecond: Scalars["Float"]["output"];
};

export type LlmHealthStatus = {
  __typename?: "LlmHealthStatus";
  available: Scalars["Boolean"]["output"];
};

export type LlmModelDescriptor = {
  __typename?: "LlmModelDescriptor";
  contextLength?: Maybe<Scalars["Int"]["output"]>;
  id: Scalars["String"]["output"];
  ownedBy?: Maybe<Scalars["String"]["output"]>;
  supportsJsonMode?: Maybe<Scalars["Boolean"]["output"]>;
  supportsToolCalling?: Maybe<Scalars["Boolean"]["output"]>;
};

export type LlmRuntimeState = {
  __typename?: "LlmRuntimeState";
  contextLength: Scalars["Int"]["output"];
  endpoint: Scalars["String"]["output"];
  lastError?: Maybe<Scalars["String"]["output"]>;
  lastProbedAt: Scalars["DateTime"]["output"];
  model: Scalars["String"]["output"];
  online: Scalars["Boolean"]["output"];
  supportsJsonMode: Scalars["Boolean"]["output"];
  supportsToolCalling: Scalars["Boolean"]["output"];
};

export type LmStudioCheck = {
  __typename?: "LmStudioCheck";
  actions: Array<DiagnosticAction>;
  code: Scalars["String"]["output"];
  endpoint?: Maybe<Scalars["String"]["output"]>;
  message: Scalars["String"]["output"];
  ok: Scalars["Boolean"]["output"];
  severity: CheckSeverity;
};

export type MeetilyImportPayload = {
  __typename?: "MeetilyImportPayload";
  errors: Array<IUserError>;
  importErrors?: Maybe<Scalars["Int"]["output"]>;
  importedRecordings?: Maybe<Scalars["Int"]["output"]>;
  skippedDuplicates?: Maybe<Scalars["Int"]["output"]>;
  totalMeetings?: Maybe<Scalars["Int"]["output"]>;
};

export type MetaInfo = {
  __typename?: "MetaInfo";
  assemblyVersion: Scalars["String"]["output"];
  buildDate: Scalars["String"]["output"];
  commit: Scalars["String"]["output"];
  version: Scalars["String"]["output"];
};

export type ModelDownloadProgressEvent = {
  __typename?: "ModelDownloadProgressEvent";
  bytesRead: Scalars["Long"]["output"];
  done: Scalars["Boolean"]["output"];
  downloadId: Scalars["String"]["output"];
  error?: Maybe<Scalars["String"]["output"]>;
  totalBytes?: Maybe<Scalars["Long"]["output"]>;
};

export type ModelEntry = {
  __typename?: "ModelEntry";
  description: Scalars["String"]["output"];
  destinationPath: Scalars["String"]["output"];
  id: Scalars["String"]["output"];
  installed: Scalars["Boolean"]["output"];
  isDefault: Scalars["Boolean"]["output"];
  kind: ModelKind;
  name: Scalars["String"]["output"];
  sizeMb: Scalars["Int"]["output"];
  tier: ModelTier;
  url: Scalars["String"]["output"];
};

export enum ModelKind {
  AudioMl = "AUDIO_ML",
  Llm = "LLM",
  NlpMl = "NLP_ML",
  Stt = "STT",
  Vad = "VAD",
}

export enum ModelTier {
  Bundle = "BUNDLE",
  Downloadable = "DOWNLOADABLE",
}

export type MutationType = {
  __typename?: "MutationType";
  acceptSyncDevice: AcceptSyncDevicePayload;
  buildPrompt: Scalars["String"]["output"];
  cancelJob: CancelJobPayload;
  createBackup: CreateBackupPayload;
  createNote: NotePayload;
  createProfile: ProfilePayload;
  createPromptTemplate: PromptTemplateDto;
  deleteNote: NotePayload;
  deleteProfile: ProfilePayload;
  deletePromptTemplate: Scalars["Boolean"]["output"];
  deleteRecording: RecordingPayload;
  dictationCancel: DictationCancelPayload;
  dictationStart: DictationStartPayload;
  dictationStop: DictationStopPayload;
  downloadModel: DownloadModelPayload;
  duplicateProfile: ProfilePayload;
  enqueueJob: JobPayload;
  exportNote: NotePayload;
  importFromMeetily: MeetilyImportPayload;
  importRecordings: ImportRecordingsPayload;
  obsidianReapplyBootstrap: ObsidianReapplyBootstrapPayload;
  obsidianReinstallPlugins: ObsidianReinstallPluginsPayload;
  obsidianRunDiagnostics: ObsidianDiagnosticsPayload;
  obsidianRunWizardStep: ObsidianWizardStepPayload;
  pauseJob: CancelJobPayload;
  publishElectronServices: RuntimeStatePayload;
  ragReindex: RagReindexPayload;
  reprobeRuntimeState: RuntimeStatePayload;
  reprocessRecording: RecordingPayload;
  resumeJob: JobPayload;
  retryJobFromStage: JobPayload;
  runRoutineNow: RoutineRunDto;
  setupObsidian: SetupObsidianPayload;
  startRecording: StartRecordingPayload;
  stopRecording: StopRecordingPayload;
  toggleRoutine: RoutineDefinitionDto;
  updateProfile: ProfilePayload;
  updatePromptTemplate?: Maybe<PromptTemplateDto>;
  updateSettings: UpdateSettingsPayload;
  updateWebSearchConfig: WebSearchConfigPayload;
  uploadRecordings: ImportRecordingsPayload;
};

export type MutationTypeAcceptSyncDeviceArgs = {
  deviceId: Scalars["String"]["input"];
  folderIds?: InputMaybe<Array<Scalars["String"]["input"]>>;
  name?: InputMaybe<Scalars["String"]["input"]>;
};

export type MutationTypeBuildPromptArgs = {
  template: Scalars["String"]["input"];
};

export type MutationTypeCancelJobArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeCreateNoteArgs = {
  input: CreateNoteInput;
};

export type MutationTypeCreateProfileArgs = {
  input: CreateProfileInput;
};

export type MutationTypeCreatePromptTemplateArgs = {
  body: Scalars["String"]["input"];
  name: Scalars["String"]["input"];
};

export type MutationTypeDeleteNoteArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeDeleteProfileArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeDeletePromptTemplateArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeDeleteRecordingArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeDictationCancelArgs = {
  sessionId: Scalars["UUID"]["input"];
};

export type MutationTypeDictationStartArgs = {
  recordingId?: InputMaybe<Scalars["UUID"]["input"]>;
  source?: InputMaybe<Scalars["String"]["input"]>;
};

export type MutationTypeDictationStopArgs = {
  bundleId?: InputMaybe<Scalars["String"]["input"]>;
  sessionId: Scalars["UUID"]["input"];
};

export type MutationTypeDownloadModelArgs = {
  catalogueId: Scalars["String"]["input"];
};

export type MutationTypeDuplicateProfileArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeEnqueueJobArgs = {
  input: EnqueueJobInput;
};

export type MutationTypeExportNoteArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeImportFromMeetilyArgs = {
  meetilyDatabasePath: Scalars["String"]["input"];
};

export type MutationTypeImportRecordingsArgs = {
  input: ImportRecordingsInput;
};

export type MutationTypeObsidianRunWizardStepArgs = {
  step: Scalars["Int"]["input"];
};

export type MutationTypePauseJobArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypePublishElectronServicesArgs = {
  input: PublishElectronServicesInput;
};

export type MutationTypeReprocessRecordingArgs = {
  profileId: Scalars["UUID"]["input"];
  recordingId: Scalars["UUID"]["input"];
};

export type MutationTypeResumeJobArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeRetryJobFromStageArgs = {
  input: RetryJobFromStageInput;
};

export type MutationTypeRunRoutineNowArgs = {
  key: Scalars["String"]["input"];
};

export type MutationTypeSetupObsidianArgs = {
  vaultPath?: InputMaybe<Scalars["String"]["input"]>;
};

export type MutationTypeStartRecordingArgs = {
  outputPath?: InputMaybe<Scalars["String"]["input"]>;
};

export type MutationTypeStopRecordingArgs = {
  sessionId: Scalars["String"]["input"];
};

export type MutationTypeToggleRoutineArgs = {
  enabled: Scalars["Boolean"]["input"];
  key: Scalars["String"]["input"];
};

export type MutationTypeUpdateProfileArgs = {
  id: Scalars["UUID"]["input"];
  input: CreateProfileInput;
};

export type MutationTypeUpdatePromptTemplateArgs = {
  body: Scalars["String"]["input"];
  id: Scalars["UUID"]["input"];
  name: Scalars["String"]["input"];
};

export type MutationTypeUpdateSettingsArgs = {
  input: UpdateSettingsInput;
};

export type MutationTypeUpdateWebSearchConfigArgs = {
  input: WebSearchConfigInput;
};

export type MutationTypeUploadRecordingsArgs = {
  input: UploadRecordingsInput;
};

/** The node interface is implemented by entities that have a global unique identifier. */
export type Node = {
  id: Scalars["ID"]["output"];
};

export type NotFoundError = IUserError & {
  __typename?: "NotFoundError";
  code: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
  resourceId: Scalars["String"]["output"];
  resourceKind: Scalars["String"]["output"];
};

export type NotePayload = {
  __typename?: "NotePayload";
  errors: Array<IUserError>;
  note?: Maybe<ProcessedNote>;
};

export enum NoteSource {
  Manual = "MANUAL",
  Processed = "PROCESSED",
}

export type NoteSourceOperationFilterInput = {
  eq?: InputMaybe<NoteSource>;
  in?: InputMaybe<Array<NoteSource>>;
  neq?: InputMaybe<NoteSource>;
  nin?: InputMaybe<Array<NoteSource>>;
};

/** A connection to a list of items. */
export type NotesConnection = {
  __typename?: "NotesConnection";
  /** A list of edges. */
  edges?: Maybe<Array<NotesEdge>>;
  /** A flattened list of the nodes. */
  nodes?: Maybe<Array<ProcessedNote>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars["Int"]["output"];
};

/** An edge in a connection. */
export type NotesEdge = {
  __typename?: "NotesEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: ProcessedNote;
};

export type ObsidianDetectionResult = {
  __typename?: "ObsidianDetectionResult";
  detected: Array<ObsidianVaultEntry>;
  searched: Array<Scalars["String"]["output"]>;
};

export type ObsidianDiagnosticsPayload = {
  __typename?: "ObsidianDiagnosticsPayload";
  errors: Array<IUserError>;
  report?: Maybe<VaultDiagnosticsReport>;
};

export type ObsidianReapplyBootstrapPayload = {
  __typename?: "ObsidianReapplyBootstrapPayload";
  backedUpTo?: Maybe<Scalars["String"]["output"]>;
  errors: Array<IUserError>;
  overwritten: Array<Scalars["String"]["output"]>;
  skipped: Array<Scalars["String"]["output"]>;
};

export type ObsidianReinstallPluginsPayload = {
  __typename?: "ObsidianReinstallPluginsPayload";
  errors: Array<IUserError>;
  reinstalled: Array<Scalars["String"]["output"]>;
};

export type ObsidianSetupReport = {
  __typename?: "ObsidianSetupReport";
  createdPaths: Array<Scalars["String"]["output"]>;
  skippedPaths: Array<Scalars["String"]["output"]>;
  vaultPath: Scalars["String"]["output"];
};

export type ObsidianVaultEntry = {
  __typename?: "ObsidianVaultEntry";
  name: Scalars["String"]["output"];
  path: Scalars["String"]["output"];
};

export type ObsidianWizardStepPayload = {
  __typename?: "ObsidianWizardStepPayload";
  currentStep: Scalars["Int"]["output"];
  diagnostics?: Maybe<VaultDiagnosticsReport>;
  errors: Array<IUserError>;
  nextStep?: Maybe<Scalars["Int"]["output"]>;
};

/** Information about pagination in a connection. */
export type PageInfo = {
  __typename?: "PageInfo";
  /** When paginating forwards, the cursor to continue. */
  endCursor?: Maybe<Scalars["String"]["output"]>;
  /** Indicates whether more edges exist following the set defined by the clients arguments. */
  hasNextPage: Scalars["Boolean"]["output"];
  /** Indicates whether more edges exist prior the set defined by the clients arguments. */
  hasPreviousPage: Scalars["Boolean"]["output"];
  /** When paginating backwards, the cursor to continue. */
  startCursor?: Maybe<Scalars["String"]["output"]>;
};

export type PendingDeviceEntry = {
  __typename?: "PendingDeviceEntry";
  address?: Maybe<Scalars["String"]["output"]>;
  deviceId: Scalars["String"]["output"];
  name?: Maybe<Scalars["String"]["output"]>;
};

export type PendingDevicesPayload = {
  __typename?: "PendingDevicesPayload";
  added: Array<PendingDeviceEntry>;
  removed: Array<Scalars["String"]["output"]>;
};

export type PluginCheck = {
  __typename?: "PluginCheck";
  actions: Array<DiagnosticAction>;
  code: Scalars["String"]["output"];
  enabled: Scalars["Boolean"]["output"];
  expectedVersion: Scalars["String"]["output"];
  hashMatches: Scalars["Boolean"]["output"];
  installed: Scalars["Boolean"]["output"];
  installedVersion?: Maybe<Scalars["String"]["output"]>;
  message: Scalars["String"]["output"];
  ok: Scalars["Boolean"]["output"];
  optional: Scalars["Boolean"]["output"];
  pluginId: Scalars["String"]["output"];
  severity: CheckSeverity;
};

export type ProcessedNote = Node & {
  __typename?: "ProcessedNote";
  actionItems: Array<ActionItem>;
  cleanTranscript: Scalars["String"]["output"];
  conversationType: ConversationType;
  createdAt: Scalars["DateTime"]["output"];
  decisions: Array<Scalars["String"]["output"]>;
  exportedToVault: Scalars["Boolean"]["output"];
  fullTranscript: Scalars["String"]["output"];
  id: Scalars["ID"]["output"];
  keyPoints: Array<Scalars["String"]["output"]>;
  markdownContent: Scalars["String"]["output"];
  participants: Array<Scalars["String"]["output"]>;
  profileId: Scalars["UUID"]["output"];
  source: NoteSource;
  summary: Scalars["String"]["output"];
  tags: Array<Scalars["String"]["output"]>;
  title: Scalars["String"]["output"];
  topic: Scalars["String"]["output"];
  transcriptId: Scalars["UUID"]["output"];
  unresolvedQuestions: Array<Scalars["String"]["output"]>;
  vaultPath?: Maybe<Scalars["String"]["output"]>;
  version: Scalars["Int"]["output"];
};

export type ProcessedNoteFilterInput = {
  actionItems?: InputMaybe<ListFilterInputTypeOfActionItemFilterInput>;
  and?: InputMaybe<Array<ProcessedNoteFilterInput>>;
  cleanTranscript?: InputMaybe<StringOperationFilterInput>;
  conversationType?: InputMaybe<ConversationTypeOperationFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  decisions?: InputMaybe<ListStringOperationFilterInput>;
  exportedToVault?: InputMaybe<BooleanOperationFilterInput>;
  fullTranscript?: InputMaybe<StringOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  keyPoints?: InputMaybe<ListStringOperationFilterInput>;
  markdownContent?: InputMaybe<StringOperationFilterInput>;
  or?: InputMaybe<Array<ProcessedNoteFilterInput>>;
  participants?: InputMaybe<ListStringOperationFilterInput>;
  profileId?: InputMaybe<UuidOperationFilterInput>;
  source?: InputMaybe<NoteSourceOperationFilterInput>;
  summary?: InputMaybe<StringOperationFilterInput>;
  tags?: InputMaybe<ListStringOperationFilterInput>;
  title?: InputMaybe<StringOperationFilterInput>;
  topic?: InputMaybe<StringOperationFilterInput>;
  transcriptId?: InputMaybe<UuidOperationFilterInput>;
  unresolvedQuestions?: InputMaybe<ListStringOperationFilterInput>;
  vaultPath?: InputMaybe<StringOperationFilterInput>;
  version?: InputMaybe<IntOperationFilterInput>;
};

export type ProcessedNoteSortInput = {
  cleanTranscript?: InputMaybe<SortEnumType>;
  conversationType?: InputMaybe<SortEnumType>;
  createdAt?: InputMaybe<SortEnumType>;
  exportedToVault?: InputMaybe<SortEnumType>;
  fullTranscript?: InputMaybe<SortEnumType>;
  id?: InputMaybe<SortEnumType>;
  markdownContent?: InputMaybe<SortEnumType>;
  profileId?: InputMaybe<SortEnumType>;
  source?: InputMaybe<SortEnumType>;
  summary?: InputMaybe<SortEnumType>;
  title?: InputMaybe<SortEnumType>;
  topic?: InputMaybe<SortEnumType>;
  transcriptId?: InputMaybe<SortEnumType>;
  vaultPath?: InputMaybe<SortEnumType>;
  version?: InputMaybe<SortEnumType>;
};

export type ProcessingJob = Node & {
  __typename?: "ProcessingJob";
  cancelRequested: Scalars["Boolean"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  currentStep?: Maybe<Scalars["String"]["output"]>;
  errorMessage?: Maybe<Scalars["String"]["output"]>;
  finishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["ID"]["output"];
  pauseRequested: Scalars["Boolean"]["output"];
  profileId: Scalars["UUID"]["output"];
  progress: Scalars["Int"]["output"];
  recordingId: Scalars["UUID"]["output"];
  stages: Array<ProcessingJobStage>;
  startedAt?: Maybe<Scalars["DateTime"]["output"]>;
  status: JobStatus;
  userHint?: Maybe<Scalars["String"]["output"]>;
};

export type ProcessingJobFilterInput = {
  and?: InputMaybe<Array<ProcessingJobFilterInput>>;
  cancelRequested?: InputMaybe<BooleanOperationFilterInput>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  currentStep?: InputMaybe<StringOperationFilterInput>;
  errorMessage?: InputMaybe<StringOperationFilterInput>;
  finishedAt?: InputMaybe<DateTimeOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  or?: InputMaybe<Array<ProcessingJobFilterInput>>;
  pauseRequested?: InputMaybe<BooleanOperationFilterInput>;
  profileId?: InputMaybe<UuidOperationFilterInput>;
  progress?: InputMaybe<IntOperationFilterInput>;
  recordingId?: InputMaybe<UuidOperationFilterInput>;
  startedAt?: InputMaybe<DateTimeOperationFilterInput>;
  status?: InputMaybe<JobStatusOperationFilterInput>;
  userHint?: InputMaybe<StringOperationFilterInput>;
};

export type ProcessingJobSortInput = {
  cancelRequested?: InputMaybe<SortEnumType>;
  createdAt?: InputMaybe<SortEnumType>;
  currentStep?: InputMaybe<SortEnumType>;
  errorMessage?: InputMaybe<SortEnumType>;
  finishedAt?: InputMaybe<SortEnumType>;
  id?: InputMaybe<SortEnumType>;
  pauseRequested?: InputMaybe<SortEnumType>;
  profileId?: InputMaybe<SortEnumType>;
  progress?: InputMaybe<SortEnumType>;
  recordingId?: InputMaybe<SortEnumType>;
  startedAt?: InputMaybe<SortEnumType>;
  status?: InputMaybe<SortEnumType>;
  userHint?: InputMaybe<SortEnumType>;
};

export type ProcessingJobStage = {
  __typename?: "ProcessingJobStage";
  durationMs?: Maybe<Scalars["Int"]["output"]>;
  errorMessage?: Maybe<Scalars["String"]["output"]>;
  finishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["UUID"]["output"];
  jobId: Scalars["UUID"]["output"];
  stageName: Scalars["String"]["output"];
  startedAt: Scalars["DateTime"]["output"];
};

export type Profile = Node & {
  __typename?: "Profile";
  autoTags: Array<Scalars["String"]["output"]>;
  cleanupLevel: CleanupLevel;
  exportFolder: Scalars["String"]["output"];
  glossaryByLanguage: Array<GlossaryEntry>;
  id: Scalars["ID"]["output"];
  isBuiltIn: Scalars["Boolean"]["output"];
  isDefault: Scalars["Boolean"]["output"];
  llmCorrectionEnabled: Scalars["Boolean"]["output"];
  llmModelOverride: Scalars["String"]["output"];
  llmProviderOverride: Scalars["String"]["output"];
  name: Scalars["String"]["output"];
  outputTemplate: Scalars["String"]["output"];
  systemPrompt: Scalars["String"]["output"];
  transcriptionPromptOverride: Scalars["String"]["output"];
};

export type ProfilePayload = {
  __typename?: "ProfilePayload";
  errors: Array<IUserError>;
  profile?: Maybe<Profile>;
};

export type PromptTemplateDto = {
  __typename?: "PromptTemplateDto";
  body: Scalars["String"]["output"];
  createdAt: Scalars["DateTime"]["output"];
  id: Scalars["UUID"]["output"];
  name: Scalars["String"]["output"];
};

export type PublishElectronServicesInput = {
  services: Array<SupervisorServiceStateInput>;
};

export type QueryType = {
  __typename?: "QueryType";
  activeJobs: Array<ProcessingJob>;
  backups: Array<BackupEntry>;
  dictationAudioCapabilities: DictationAudioCapabilities;
  dictationStatus?: Maybe<DictationSessionStatus>;
  health: HealthStatus;
  job?: Maybe<ProcessingJob>;
  jobs?: Maybe<JobsConnection>;
  llmCapabilities?: Maybe<LlmCapabilities>;
  llmHealth: LlmHealthStatus;
  llmModels: Array<LlmModelDescriptor>;
  meta: MetaInfo;
  models: Array<ModelEntry>;
  /** Fetches an object given its ID. */
  node?: Maybe<Node>;
  /** Lookup nodes by a list of IDs. */
  nodes: Array<Maybe<Node>>;
  note?: Maybe<ProcessedNote>;
  notes?: Maybe<NotesConnection>;
  obsidianDetect: ObsidianDetectionResult;
  previewPrompt: Scalars["String"]["output"];
  profile?: Maybe<Profile>;
  profiles: Array<Profile>;
  promptTemplate?: Maybe<PromptTemplateDto>;
  promptTemplates: Array<PromptTemplateDto>;
  ragQuery?: Maybe<RagQueryResult>;
  ragStatus: RagIndexStatus;
  recording?: Maybe<Recording>;
  recordings?: Maybe<RecordingsConnection>;
  routineRuns: Array<RoutineRunDto>;
  routines: Array<RoutineDefinitionDto>;
  runtimeState: RuntimeState;
  settings: AppSettingsDto;
  suggestGlossaryTerms: Array<Scalars["String"]["output"]>;
  syncHealth: Scalars["Boolean"]["output"];
  syncPairingPayload?: Maybe<SyncPairingPayloadResult>;
  syncStatus?: Maybe<SyncStatusResult>;
  systemActionTemplates: Array<SystemActionTemplateDto>;
  unifiedSearch: UnifiedSearchPayload;
  webSearchConfig: WebSearchConfigDto;
};

export type QueryTypeDictationStatusArgs = {
  sessionId: Scalars["UUID"]["input"];
};

export type QueryTypeJobArgs = {
  id: Scalars["UUID"]["input"];
};

export type QueryTypeJobsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  order?: InputMaybe<Array<ProcessingJobSortInput>>;
  where?: InputMaybe<ProcessingJobFilterInput>;
};

export type QueryTypeNodeArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryTypeNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

export type QueryTypeNoteArgs = {
  id: Scalars["UUID"]["input"];
};

export type QueryTypeNotesArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  order?: InputMaybe<Array<ProcessedNoteSortInput>>;
  where?: InputMaybe<ProcessedNoteFilterInput>;
};

export type QueryTypePreviewPromptArgs = {
  templateBody: Scalars["String"]["input"];
};

export type QueryTypeProfileArgs = {
  id: Scalars["UUID"]["input"];
};

export type QueryTypePromptTemplateArgs = {
  id: Scalars["UUID"]["input"];
};

export type QueryTypeRagQueryArgs = {
  question: Scalars["String"]["input"];
  topK?: InputMaybe<Scalars["Int"]["input"]>;
};

export type QueryTypeRecordingArgs = {
  id: Scalars["UUID"]["input"];
};

export type QueryTypeRecordingsArgs = {
  after?: InputMaybe<Scalars["String"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
  first?: InputMaybe<Scalars["Int"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  order?: InputMaybe<Array<RecordingSortInput>>;
  where?: InputMaybe<RecordingFilterInput>;
};

export type QueryTypeRoutineRunsArgs = {
  key: Scalars["String"]["input"];
  limit: Scalars["Int"]["input"];
};

export type QueryTypeSuggestGlossaryTermsArgs = {
  language: Scalars["String"]["input"];
  profileId: Scalars["UUID"]["input"];
};

export type QueryTypeUnifiedSearchArgs = {
  includeWeb?: InputMaybe<Scalars["Boolean"]["input"]>;
  query: Scalars["String"]["input"];
};

export type RagCitation = {
  __typename?: "RagCitation";
  noteId: Scalars["UUID"]["output"];
  segmentId: Scalars["String"]["output"];
  snippet: Scalars["String"]["output"];
  text: Scalars["String"]["output"];
};

export type RagIndexStatus = {
  __typename?: "RagIndexStatus";
  chunks: Scalars["Int"]["output"];
  embeddedNotes: Scalars["Int"]["output"];
};

export type RagQueryResult = {
  __typename?: "RagQueryResult";
  answer: Scalars["String"]["output"];
  citations: Array<RagCitation>;
  llmAvailable: Scalars["Boolean"]["output"];
};

export type RagReindexPayload = {
  __typename?: "RagReindexPayload";
  chunks?: Maybe<Scalars["Int"]["output"]>;
  embeddedNotes?: Maybe<Scalars["Int"]["output"]>;
  errors: Array<IUserError>;
};

export type Recording = Node & {
  __typename?: "Recording";
  createdAt: Scalars["DateTime"]["output"];
  duration: Scalars["TimeSpan"]["output"];
  fileName: Scalars["String"]["output"];
  filePath: Scalars["String"]["output"];
  format: AudioFormat;
  id: Scalars["ID"]["output"];
  notes: Array<ProcessedNote>;
  sha256: Scalars["String"]["output"];
  sourceType: SourceType;
  status: RecordingStatus;
};

export type RecordingFilterInput = {
  and?: InputMaybe<Array<RecordingFilterInput>>;
  createdAt?: InputMaybe<DateTimeOperationFilterInput>;
  duration?: InputMaybe<TimeSpanOperationFilterInput>;
  fileName?: InputMaybe<StringOperationFilterInput>;
  filePath?: InputMaybe<StringOperationFilterInput>;
  format?: InputMaybe<AudioFormatOperationFilterInput>;
  id?: InputMaybe<UuidOperationFilterInput>;
  or?: InputMaybe<Array<RecordingFilterInput>>;
  sha256?: InputMaybe<StringOperationFilterInput>;
  sourceType?: InputMaybe<SourceTypeOperationFilterInput>;
  status?: InputMaybe<RecordingStatusOperationFilterInput>;
};

export type RecordingPartialPayload = {
  __typename?: "RecordingPartialPayload";
  endSeconds: Scalars["Float"]["output"];
  isFinal: Scalars["Boolean"]["output"];
  observedAt: Scalars["DateTime"]["output"];
  recordingId: Scalars["UUID"]["output"];
  sessionId: Scalars["UUID"]["output"];
  startSeconds: Scalars["Float"]["output"];
  text: Scalars["String"]["output"];
};

export type RecordingPayload = {
  __typename?: "RecordingPayload";
  errors: Array<IUserError>;
  recording?: Maybe<Recording>;
};

export type RecordingSortInput = {
  createdAt?: InputMaybe<SortEnumType>;
  duration?: InputMaybe<SortEnumType>;
  fileName?: InputMaybe<SortEnumType>;
  filePath?: InputMaybe<SortEnumType>;
  format?: InputMaybe<SortEnumType>;
  id?: InputMaybe<SortEnumType>;
  sha256?: InputMaybe<SortEnumType>;
  sourceType?: InputMaybe<SortEnumType>;
  status?: InputMaybe<SortEnumType>;
};

export enum RecordingStatus {
  Failed = "FAILED",
  New = "NEW",
  Transcribed = "TRANSCRIBED",
  Transcribing = "TRANSCRIBING",
}

export type RecordingStatusOperationFilterInput = {
  eq?: InputMaybe<RecordingStatus>;
  in?: InputMaybe<Array<RecordingStatus>>;
  neq?: InputMaybe<RecordingStatus>;
  nin?: InputMaybe<Array<RecordingStatus>>;
};

/** A connection to a list of items. */
export type RecordingsConnection = {
  __typename?: "RecordingsConnection";
  /** A list of edges. */
  edges?: Maybe<Array<RecordingsEdge>>;
  /** A flattened list of the nodes. */
  nodes?: Maybe<Array<Recording>>;
  /** Information to aid in pagination. */
  pageInfo: PageInfo;
  /** Identifies the total count of items in the connection. */
  totalCount: Scalars["Int"]["output"];
};

/** An edge in a connection. */
export type RecordingsEdge = {
  __typename?: "RecordingsEdge";
  /** A cursor for use in pagination. */
  cursor: Scalars["String"]["output"];
  /** The item at the end of the edge. */
  node: Recording;
};

export type RestApiCheck = {
  __typename?: "RestApiCheck";
  actions: Array<DiagnosticAction>;
  code: Scalars["String"]["output"];
  host?: Maybe<Scalars["String"]["output"]>;
  message: Scalars["String"]["output"];
  ok: Scalars["Boolean"]["output"];
  required: Scalars["Boolean"]["output"];
  severity: CheckSeverity;
  version?: Maybe<Scalars["String"]["output"]>;
};

export type RetryJobFromStageInput = {
  fromStage: JobStage;
  jobId: Scalars["UUID"]["input"];
  skipFailed: Scalars["Boolean"]["input"];
};

export type RoutineDefinitionDto = {
  __typename?: "RoutineDefinitionDto";
  description: Scalars["String"]["output"];
  displayName: Scalars["String"]["output"];
  isEnabled: Scalars["Boolean"]["output"];
  key: Scalars["String"]["output"];
  lastRun?: Maybe<RoutineRunDto>;
};

export type RoutineRunDto = {
  __typename?: "RoutineRunDto";
  errorMessage?: Maybe<Scalars["String"]["output"]>;
  finishedAt?: Maybe<Scalars["DateTime"]["output"]>;
  id: Scalars["UUID"]["output"];
  payloadSummary?: Maybe<Scalars["String"]["output"]>;
  routineKey: Scalars["String"]["output"];
  startedAt: Scalars["DateTime"]["output"];
  status: Scalars["String"]["output"];
};

export type RuntimeState = {
  __typename?: "RuntimeState";
  llm: LlmRuntimeState;
  services: Array<SupervisorServiceState>;
  syncthing: SyncthingRuntimeState;
};

export type RuntimeStatePayload = {
  __typename?: "RuntimeStatePayload";
  errors: Array<IUserError>;
  state?: Maybe<RuntimeState>;
};

export type SetupObsidianPayload = {
  __typename?: "SetupObsidianPayload";
  errors: Array<IUserError>;
  report?: Maybe<ObsidianSetupReport>;
};

export enum SortEnumType {
  Asc = "ASC",
  Desc = "DESC",
}

export enum SourceType {
  Imported = "IMPORTED",
  Recorded = "RECORDED",
}

export type SourceTypeOperationFilterInput = {
  eq?: InputMaybe<SourceType>;
  in?: InputMaybe<Array<SourceType>>;
  neq?: InputMaybe<SourceType>;
  nin?: InputMaybe<Array<SourceType>>;
};

export type StartRecordingPayload = {
  __typename?: "StartRecordingPayload";
  dictationSessionId?: Maybe<Scalars["UUID"]["output"]>;
  errors: Array<IUserError>;
  outputPath?: Maybe<Scalars["String"]["output"]>;
  recordingId?: Maybe<Scalars["UUID"]["output"]>;
  sessionId?: Maybe<Scalars["String"]["output"]>;
};

export type StopRecordingPayload = {
  __typename?: "StopRecordingPayload";
  errors: Array<IUserError>;
  recordings: Array<Recording>;
  sessionId?: Maybe<Scalars["String"]["output"]>;
};

export type StringOperationFilterInput = {
  and?: InputMaybe<Array<StringOperationFilterInput>>;
  contains?: InputMaybe<Scalars["String"]["input"]>;
  endsWith?: InputMaybe<Scalars["String"]["input"]>;
  eq?: InputMaybe<Scalars["String"]["input"]>;
  in?: InputMaybe<Array<InputMaybe<Scalars["String"]["input"]>>>;
  ncontains?: InputMaybe<Scalars["String"]["input"]>;
  nendsWith?: InputMaybe<Scalars["String"]["input"]>;
  neq?: InputMaybe<Scalars["String"]["input"]>;
  nin?: InputMaybe<Array<InputMaybe<Scalars["String"]["input"]>>>;
  nstartsWith?: InputMaybe<Scalars["String"]["input"]>;
  or?: InputMaybe<Array<StringOperationFilterInput>>;
  startsWith?: InputMaybe<Scalars["String"]["input"]>;
};

export type SubscriptionType = {
  __typename?: "SubscriptionType";
  audioDeviceChanged: AudioDeviceChangedEvent;
  dictationEvents: DictationPartialEvent;
  hotkeyEvents: HotkeyEventMessage;
  jobProgress: ProcessingJob;
  modelDownloadProgress: ModelDownloadProgressEvent;
  recordingPartials: RecordingPartialPayload;
  runtimeStateChanged: RuntimeState;
  syncEvents: SyncEventMessage;
};

export type SubscriptionTypeDictationEventsArgs = {
  sessionId: Scalars["UUID"]["input"];
};

export type SubscriptionTypeModelDownloadProgressArgs = {
  downloadId: Scalars["String"]["input"];
};

export type SubscriptionTypeRecordingPartialsArgs = {
  recordingId: Scalars["UUID"]["input"];
};

export type SupervisorServiceState = {
  __typename?: "SupervisorServiceState";
  lastError?: Maybe<Scalars["String"]["output"]>;
  name: Scalars["String"]["output"];
  pid?: Maybe<Scalars["Int"]["output"]>;
  port?: Maybe<Scalars["Int"]["output"]>;
  restartCount: Scalars["Int"]["output"];
  state: Scalars["String"]["output"];
};

export type SupervisorServiceStateInput = {
  lastError?: InputMaybe<Scalars["String"]["input"]>;
  name: Scalars["String"]["input"];
  pid?: InputMaybe<Scalars["Int"]["input"]>;
  port?: InputMaybe<Scalars["Int"]["input"]>;
  restartCount: Scalars["Int"]["input"];
  state: Scalars["String"]["input"];
};

export type SyncDeviceEntry = {
  __typename?: "SyncDeviceEntry";
  connected: Scalars["Boolean"]["output"];
  id: Scalars["String"]["output"];
  lastSeen?: Maybe<Scalars["DateTime"]["output"]>;
  name: Scalars["String"]["output"];
};

export type SyncEventMessage = {
  __typename?: "SyncEventMessage";
  deviceConnection?: Maybe<DeviceConnectionPayload>;
  fileConflict?: Maybe<FileConflictPayload>;
  folderCompletion?: Maybe<FolderCompletionPayload>;
  id: Scalars["Long"]["output"];
  pendingDevices?: Maybe<PendingDevicesPayload>;
  time: Scalars["DateTime"]["output"];
  type: Scalars["String"]["output"];
};

export type SyncFolderEntry = {
  __typename?: "SyncFolderEntry";
  completionPct: Scalars["Float"]["output"];
  conflicts: Scalars["Int"]["output"];
  id: Scalars["String"]["output"];
  state: Scalars["String"]["output"];
};

export type SyncPairingPayloadResult = {
  __typename?: "SyncPairingPayloadResult";
  deviceId: Scalars["String"]["output"];
  folderIds: Array<Scalars["String"]["output"]>;
  uri: Scalars["String"]["output"];
};

export type SyncStatusResult = {
  __typename?: "SyncStatusResult";
  devices: Array<SyncDeviceEntry>;
  folders: Array<SyncFolderEntry>;
};

export type SyncthingRuntimeState = {
  __typename?: "SyncthingRuntimeState";
  apiUrl?: Maybe<Scalars["String"]["output"]>;
  binaryPath?: Maybe<Scalars["String"]["output"]>;
  detection: Scalars["String"]["output"];
  hint?: Maybe<Scalars["String"]["output"]>;
  version?: Maybe<Scalars["String"]["output"]>;
};

export type SystemActionTemplateDto = {
  __typename?: "SystemActionTemplateDto";
  deeplinkUrl: Scalars["String"]["output"];
  description: Scalars["String"]["output"];
  name: Scalars["String"]["output"];
};

export type TemplaterSettingsCheck = {
  __typename?: "TemplaterSettingsCheck";
  actions: Array<DiagnosticAction>;
  code: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
  ok: Scalars["Boolean"]["output"];
  severity: CheckSeverity;
  templatesFolder?: Maybe<Scalars["String"]["output"]>;
  userScriptsFolder?: Maybe<Scalars["String"]["output"]>;
};

export type TimeSpanOperationFilterInput = {
  eq?: InputMaybe<Scalars["TimeSpan"]["input"]>;
  gt?: InputMaybe<Scalars["TimeSpan"]["input"]>;
  gte?: InputMaybe<Scalars["TimeSpan"]["input"]>;
  in?: InputMaybe<Array<InputMaybe<Scalars["TimeSpan"]["input"]>>>;
  lt?: InputMaybe<Scalars["TimeSpan"]["input"]>;
  lte?: InputMaybe<Scalars["TimeSpan"]["input"]>;
  neq?: InputMaybe<Scalars["TimeSpan"]["input"]>;
  ngt?: InputMaybe<Scalars["TimeSpan"]["input"]>;
  ngte?: InputMaybe<Scalars["TimeSpan"]["input"]>;
  nin?: InputMaybe<Array<InputMaybe<Scalars["TimeSpan"]["input"]>>>;
  nlt?: InputMaybe<Scalars["TimeSpan"]["input"]>;
  nlte?: InputMaybe<Scalars["TimeSpan"]["input"]>;
};

export type UnavailableError = IUserError & {
  __typename?: "UnavailableError";
  code: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
};

export type UnifiedCitationDto = {
  __typename?: "UnifiedCitationDto";
  reference: Scalars["String"]["output"];
  snippet: Scalars["String"]["output"];
  source: Scalars["String"]["output"];
  url?: Maybe<Scalars["String"]["output"]>;
};

export type UnifiedSearchPayload = {
  __typename?: "UnifiedSearchPayload";
  answer: Scalars["String"]["output"];
  citations: Array<UnifiedCitationDto>;
};

export type UpdateSettingsInput = {
  actionsSkillEnabled?: Scalars["Boolean"]["input"];
  claudeCliPath?: Scalars["String"]["input"];
  dictationAppProfiles: Array<KeyValuePairOfStringAndStringInput>;
  dictationCaptureSampleRate: Scalars["Int"]["input"];
  dictationClassifyIntentEnabled?: Scalars["Boolean"]["input"];
  dictationDumpEnabled?: Scalars["Boolean"]["input"];
  dictationDumpHotkeyHold?: Scalars["String"]["input"];
  dictationDumpHotkeyToggle?: Scalars["String"]["input"];
  dictationEnabled: Scalars["Boolean"]["input"];
  dictationHotkeyType: Scalars["String"]["input"];
  dictationInjectMode: Scalars["String"]["input"];
  dictationKeyboardHotkey: Scalars["String"]["input"];
  dictationLanguage: Scalars["String"]["input"];
  dictationLlmPolish: Scalars["Boolean"]["input"];
  dictationModelUnloadMinutes: Scalars["Int"]["input"];
  dictationMouseButton: Scalars["Int"]["input"];
  dictationOverlayEnabled: Scalars["Boolean"]["input"];
  dictationOverlayPosition: Scalars["String"]["input"];
  dictationPushToTalk?: Scalars["Boolean"]["input"];
  dictationSoundFeedback: Scalars["Boolean"]["input"];
  dictationTempAudioPath: Scalars["String"]["input"];
  dictationVocabulary: Array<Scalars["String"]["input"]>;
  dictationWhisperModelId: Scalars["String"]["input"];
  language: Scalars["String"]["input"];
  llmApiKey: Scalars["String"]["input"];
  llmEndpoint: Scalars["String"]["input"];
  llmModel: Scalars["String"]["input"];
  llmProvider: Scalars["String"]["input"];
  mcpServerEnabled?: Scalars["Boolean"]["input"];
  mcpServerPort?: Scalars["Int"]["input"];
  mcpServerToken?: Scalars["String"]["input"];
  obsidianApiHost: Scalars["String"]["input"];
  obsidianApiToken: Scalars["String"]["input"];
  obsidianFeatureEnabled?: Scalars["Boolean"]["input"];
  remindersSkillEnabled?: Scalars["Boolean"]["input"];
  sidecarEnrichmentEnabled?: Scalars["Boolean"]["input"];
  syncthingApiKey: Scalars["String"]["input"];
  syncthingBaseUrl: Scalars["String"]["input"];
  syncthingEnabled: Scalars["Boolean"]["input"];
  syncthingObsidianVaultPath: Scalars["String"]["input"];
  themeMode: Scalars["String"]["input"];
  vadModelPath: Scalars["String"]["input"];
  vaultPath: Scalars["String"]["input"];
  webCacheTtlHours?: Scalars["Int"]["input"];
  whisperModelPath: Scalars["String"]["input"];
  whisperThreads: Scalars["Int"]["input"];
};

export type UpdateSettingsPayload = {
  __typename?: "UpdateSettingsPayload";
  errors: Array<IUserError>;
  settings?: Maybe<AppSettingsDto>;
};

export type UploadRecordingsInput = {
  filePaths: Array<Scalars["String"]["input"]>;
  profileId?: InputMaybe<Scalars["UUID"]["input"]>;
};

export type UuidOperationFilterInput = {
  eq?: InputMaybe<Scalars["UUID"]["input"]>;
  gt?: InputMaybe<Scalars["UUID"]["input"]>;
  gte?: InputMaybe<Scalars["UUID"]["input"]>;
  in?: InputMaybe<Array<InputMaybe<Scalars["UUID"]["input"]>>>;
  lt?: InputMaybe<Scalars["UUID"]["input"]>;
  lte?: InputMaybe<Scalars["UUID"]["input"]>;
  neq?: InputMaybe<Scalars["UUID"]["input"]>;
  ngt?: InputMaybe<Scalars["UUID"]["input"]>;
  ngte?: InputMaybe<Scalars["UUID"]["input"]>;
  nin?: InputMaybe<Array<InputMaybe<Scalars["UUID"]["input"]>>>;
  nlt?: InputMaybe<Scalars["UUID"]["input"]>;
  nlte?: InputMaybe<Scalars["UUID"]["input"]>;
};

export type ValidationError = IUserError & {
  __typename?: "ValidationError";
  code: Scalars["String"]["output"];
  field: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
};

export type VaultDiagnosticsReport = {
  __typename?: "VaultDiagnosticsReport";
  bootstrap: BootstrapDriftCheck;
  generatedAt: Scalars["DateTime"]["output"];
  isHealthy: Scalars["Boolean"]["output"];
  lmStudio: LmStudioCheck;
  plugins: Array<PluginCheck>;
  restApi: RestApiCheck;
  snapshotId: Scalars["UUID"]["output"];
  templater: TemplaterSettingsCheck;
  vault: VaultPathCheck;
};

export type VaultPathCheck = {
  __typename?: "VaultPathCheck";
  actions: Array<DiagnosticAction>;
  code: Scalars["String"]["output"];
  message: Scalars["String"]["output"];
  ok: Scalars["Boolean"]["output"];
  severity: CheckSeverity;
  vaultPath: Scalars["String"]["output"];
};

export type WebSearchConfigDto = {
  __typename?: "WebSearchConfigDto";
  cacheTtlHours: Scalars["Int"]["output"];
  ddgEnabled: Scalars["Boolean"]["output"];
  googleEnabled: Scalars["Boolean"]["output"];
  rawSettingsYaml: Scalars["String"]["output"];
  yandexEnabled: Scalars["Boolean"]["output"];
};

export type WebSearchConfigInput = {
  cacheTtlHours: Scalars["Int"]["input"];
  ddgEnabled: Scalars["Boolean"]["input"];
  googleEnabled: Scalars["Boolean"]["input"];
  yandexEnabled: Scalars["Boolean"]["input"];
};

export type WebSearchConfigPayload = {
  __typename?: "WebSearchConfigPayload";
  config?: Maybe<WebSearchConfigDto>;
  errors: Array<IUserError>;
};

export type UnifiedSearchQueryVariables = Exact<{
  query: Scalars["String"]["input"];
  includeWeb?: InputMaybe<Scalars["Boolean"]["input"]>;
}>;

export type UnifiedSearchQuery = {
  __typename?: "QueryType";
  unifiedSearch: {
    __typename?: "UnifiedSearchPayload";
    answer: string;
    citations: Array<{
      __typename?: "UnifiedCitationDto";
      source: string;
      reference: string;
      snippet: string;
      url?: string | null;
    }>;
  };
};

export type QueryBackupsQueryVariables = Exact<{ [key: string]: never }>;

export type QueryBackupsQuery = {
  __typename?: "QueryType";
  backups: Array<{
    __typename?: "BackupEntry";
    name: string;
    path: string;
    sizeBytes: any;
    createdAt: string;
  }>;
};

export type MutationCreateBackupMutationVariables = Exact<{ [key: string]: never }>;

export type MutationCreateBackupMutation = {
  __typename?: "MutationType";
  createBackup: {
    __typename?: "CreateBackupPayload";
    backup?: {
      __typename?: "BackupEntry";
      name: string;
      path: string;
      sizeBytes: any;
      createdAt: string;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type QueryDictationAudioCapabilitiesQueryVariables = Exact<{ [key: string]: never }>;

export type QueryDictationAudioCapabilitiesQuery = {
  __typename?: "QueryType";
  dictationAudioCapabilities: {
    __typename?: "DictationAudioCapabilities";
    isSupported: boolean;
    detectedPlatform: string;
    permissionsRequired: Array<string>;
  };
};

export type QueryDictationStatusQueryVariables = Exact<{
  sessionId: Scalars["UUID"]["input"];
}>;

export type QueryDictationStatusQuery = {
  __typename?: "QueryType";
  dictationStatus?: {
    __typename?: "DictationSessionStatus";
    sessionId: string;
    state: string;
    source?: string | null;
    startedAt: string;
  } | null;
};

export type MutationDictationStartMutationVariables = Exact<{
  source?: InputMaybe<Scalars["String"]["input"]>;
  recordingId?: InputMaybe<Scalars["UUID"]["input"]>;
}>;

export type MutationDictationStartMutation = {
  __typename?: "MutationType";
  dictationStart: {
    __typename?: "DictationStartPayload";
    sessionId?: string | null;
    source?: string | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationDictationStopMutationVariables = Exact<{
  sessionId: Scalars["UUID"]["input"];
  bundleId?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type MutationDictationStopMutation = {
  __typename?: "MutationType";
  dictationStop: {
    __typename?: "DictationStopPayload";
    rawText?: string | null;
    polishedText?: string | null;
    durationMs?: number | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationDictationCancelMutationVariables = Exact<{
  sessionId: Scalars["UUID"]["input"];
}>;

export type MutationDictationCancelMutation = {
  __typename?: "MutationType";
  dictationCancel: {
    __typename?: "DictationCancelPayload";
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type SubscriptionDictationEventsSubscriptionVariables = Exact<{
  sessionId: Scalars["UUID"]["input"];
}>;

export type SubscriptionDictationEventsSubscription = {
  __typename?: "SubscriptionType";
  dictationEvents: {
    __typename?: "DictationPartialEvent";
    sessionId: string;
    text: string;
    timestampMs: number;
  };
};

export type SubscriptionAudioDeviceChangedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type SubscriptionAudioDeviceChangedSubscription = {
  __typename?: "SubscriptionType";
  audioDeviceChanged: {
    __typename?: "AudioDeviceChangedEvent";
    kind: string;
    observedAt: string;
    devices: Array<{
      __typename?: "AudioDeviceEntry";
      id: string;
      name: string;
      isDefault: boolean;
    }>;
  };
};

export type SubscriptionHotkeyEventsSubscriptionVariables = Exact<{ [key: string]: never }>;

export type SubscriptionHotkeyEventsSubscription = {
  __typename?: "SubscriptionType";
  hotkeyEvents: {
    __typename?: "HotkeyEventMessage";
    kind: string;
    accelerator: string;
    observedAt: string;
  };
};

export type QueryHealthQueryVariables = Exact<{ [key: string]: never }>;

export type QueryHealthQuery = {
  __typename?: "QueryType";
  health: { __typename?: "HealthStatus"; status: string; time: string };
};

export type QueryLlmHealthQueryVariables = Exact<{ [key: string]: never }>;

export type QueryLlmHealthQuery = {
  __typename?: "QueryType";
  llmHealth: { __typename?: "LlmHealthStatus"; available: boolean };
};

export type QueryMetaQueryVariables = Exact<{ [key: string]: never }>;

export type QueryMetaQuery = {
  __typename?: "QueryType";
  meta: {
    __typename?: "MetaInfo";
    version: string;
    assemblyVersion: string;
    commit: string;
    buildDate: string;
  };
};

export type QueryJobsQueryVariables = Exact<{
  first?: InputMaybe<Scalars["Int"]["input"]>;
  after?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type QueryJobsQuery = {
  __typename?: "QueryType";
  jobs?: {
    __typename?: "JobsConnection";
    nodes?: Array<{
      __typename?: "ProcessingJob";
      id: string;
      recordingId: string;
      profileId: string;
      status: JobStatus;
      progress: number;
      currentStep?: string | null;
      errorMessage?: string | null;
      userHint?: string | null;
      createdAt: string;
      startedAt?: string | null;
      finishedAt?: string | null;
    }> | null;
    pageInfo: { __typename?: "PageInfo"; hasNextPage: boolean; endCursor?: string | null };
  } | null;
};

export type QueryActiveJobsQueryVariables = Exact<{ [key: string]: never }>;

export type QueryActiveJobsQuery = {
  __typename?: "QueryType";
  activeJobs: Array<{
    __typename?: "ProcessingJob";
    id: string;
    recordingId: string;
    profileId: string;
    status: JobStatus;
    progress: number;
    currentStep?: string | null;
    errorMessage?: string | null;
    userHint?: string | null;
    createdAt: string;
    startedAt?: string | null;
    finishedAt?: string | null;
  }>;
};

export type MutationEnqueueJobMutationVariables = Exact<{
  input: EnqueueJobInput;
}>;

export type MutationEnqueueJobMutation = {
  __typename?: "MutationType";
  enqueueJob: {
    __typename?: "JobPayload";
    job?: {
      __typename?: "ProcessingJob";
      id: string;
      recordingId: string;
      profileId: string;
      status: JobStatus;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationCancelJobMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type MutationCancelJobMutation = {
  __typename?: "MutationType";
  cancelJob: {
    __typename?: "CancelJobPayload";
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationPauseJobMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type MutationPauseJobMutation = {
  __typename?: "MutationType";
  pauseJob: {
    __typename?: "CancelJobPayload";
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationResumeJobMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type MutationResumeJobMutation = {
  __typename?: "MutationType";
  resumeJob: {
    __typename?: "JobPayload";
    job?: {
      __typename?: "ProcessingJob";
      id: string;
      recordingId: string;
      profileId: string;
      status: JobStatus;
      progress: number;
      currentStep?: string | null;
      errorMessage?: string | null;
      userHint?: string | null;
      createdAt: string;
      startedAt?: string | null;
      finishedAt?: string | null;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationRetryJobFromStageMutationVariables = Exact<{
  input: RetryJobFromStageInput;
}>;

export type MutationRetryJobFromStageMutation = {
  __typename?: "MutationType";
  retryJobFromStage: {
    __typename?: "JobPayload";
    job?: {
      __typename?: "ProcessingJob";
      id: string;
      recordingId: string;
      profileId: string;
      status: JobStatus;
      progress: number;
      currentStep?: string | null;
      errorMessage?: string | null;
      userHint?: string | null;
      createdAt: string;
      startedAt?: string | null;
      finishedAt?: string | null;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type SubscriptionJobProgressSubscriptionVariables = Exact<{ [key: string]: never }>;

export type SubscriptionJobProgressSubscription = {
  __typename?: "SubscriptionType";
  jobProgress: {
    __typename?: "ProcessingJob";
    id: string;
    recordingId: string;
    profileId: string;
    status: JobStatus;
    progress: number;
    currentStep?: string | null;
    errorMessage?: string | null;
    userHint?: string | null;
    createdAt: string;
    startedAt?: string | null;
    finishedAt?: string | null;
  };
};

export type QueryLlmModelsQueryVariables = Exact<{ [key: string]: never }>;

export type QueryLlmModelsQuery = {
  __typename?: "QueryType";
  llmModels: Array<{
    __typename?: "LlmModelDescriptor";
    id: string;
    ownedBy?: string | null;
    contextLength?: number | null;
    supportsToolCalling?: boolean | null;
    supportsJsonMode?: boolean | null;
  }>;
};

export type MutationImportFromMeetilyMutationVariables = Exact<{
  meetilyDatabasePath: Scalars["String"]["input"];
}>;

export type MutationImportFromMeetilyMutation = {
  __typename?: "MutationType";
  importFromMeetily: {
    __typename?: "MeetilyImportPayload";
    totalMeetings?: number | null;
    importedRecordings?: number | null;
    skippedDuplicates?: number | null;
    importErrors?: number | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type QueryModelsQueryVariables = Exact<{ [key: string]: never }>;

export type QueryModelsQuery = {
  __typename?: "QueryType";
  models: Array<{
    __typename?: "ModelEntry";
    id: string;
    name: string;
    description: string;
    url: string;
    sizeMb: number;
    kind: ModelKind;
    tier: ModelTier;
    isDefault: boolean;
    destinationPath: string;
    installed: boolean;
  }>;
};

export type MutationDownloadModelMutationVariables = Exact<{
  catalogueId: Scalars["String"]["input"];
}>;

export type MutationDownloadModelMutation = {
  __typename?: "MutationType";
  downloadModel: {
    __typename?: "DownloadModelPayload";
    downloadId?: string | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type SubscriptionModelDownloadProgressSubscriptionVariables = Exact<{
  downloadId: Scalars["String"]["input"];
}>;

export type SubscriptionModelDownloadProgressSubscription = {
  __typename?: "SubscriptionType";
  modelDownloadProgress: {
    __typename?: "ModelDownloadProgressEvent";
    downloadId: string;
    bytesRead: any;
    totalBytes?: any | null;
    done: boolean;
    error?: string | null;
  };
};

export type QueryRuntimeStateQueryVariables = Exact<{ [key: string]: never }>;

export type QueryRuntimeStateQuery = {
  __typename?: "QueryType";
  runtimeState: {
    __typename?: "RuntimeState";
    llm: {
      __typename?: "LlmRuntimeState";
      endpoint: string;
      online: boolean;
      lastProbedAt: string;
      model: string;
      contextLength: number;
      supportsToolCalling: boolean;
      supportsJsonMode: boolean;
      lastError?: string | null;
    };
    syncthing: {
      __typename?: "SyncthingRuntimeState";
      detection: string;
      binaryPath?: string | null;
      apiUrl?: string | null;
      version?: string | null;
      hint?: string | null;
    };
    services: Array<{
      __typename?: "SupervisorServiceState";
      name: string;
      state: string;
      lastError?: string | null;
      restartCount: number;
      pid?: number | null;
      port?: number | null;
    }>;
  };
};

export type SubscriptionRuntimeStateChangedSubscriptionVariables = Exact<{ [key: string]: never }>;

export type SubscriptionRuntimeStateChangedSubscription = {
  __typename?: "SubscriptionType";
  runtimeStateChanged: {
    __typename?: "RuntimeState";
    llm: {
      __typename?: "LlmRuntimeState";
      endpoint: string;
      online: boolean;
      lastProbedAt: string;
      model: string;
      contextLength: number;
      supportsToolCalling: boolean;
      supportsJsonMode: boolean;
      lastError?: string | null;
    };
    syncthing: {
      __typename?: "SyncthingRuntimeState";
      detection: string;
      binaryPath?: string | null;
      apiUrl?: string | null;
      version?: string | null;
      hint?: string | null;
    };
    services: Array<{
      __typename?: "SupervisorServiceState";
      name: string;
      state: string;
      lastError?: string | null;
      restartCount: number;
      pid?: number | null;
      port?: number | null;
    }>;
  };
};

export type MutationReprobeRuntimeStateMutationVariables = Exact<{ [key: string]: never }>;

export type MutationReprobeRuntimeStateMutation = {
  __typename?: "MutationType";
  reprobeRuntimeState: {
    __typename?: "RuntimeStatePayload";
    state?: {
      __typename?: "RuntimeState";
      llm: {
        __typename?: "LlmRuntimeState";
        endpoint: string;
        online: boolean;
        lastProbedAt: string;
        model: string;
        contextLength: number;
        supportsToolCalling: boolean;
        supportsJsonMode: boolean;
        lastError?: string | null;
      };
      syncthing: {
        __typename?: "SyncthingRuntimeState";
        detection: string;
        binaryPath?: string | null;
        apiUrl?: string | null;
        version?: string | null;
        hint?: string | null;
      };
      services: Array<{
        __typename?: "SupervisorServiceState";
        name: string;
        state: string;
        lastError?: string | null;
        restartCount: number;
        pid?: number | null;
        port?: number | null;
      }>;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationPublishElectronServicesMutationVariables = Exact<{
  input: PublishElectronServicesInput;
}>;

export type MutationPublishElectronServicesMutation = {
  __typename?: "MutationType";
  publishElectronServices: {
    __typename?: "RuntimeStatePayload";
    state?: {
      __typename?: "RuntimeState";
      services: Array<{
        __typename?: "SupervisorServiceState";
        name: string;
        state: string;
        lastError?: string | null;
        restartCount: number;
        pid?: number | null;
        port?: number | null;
      }>;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type QueryNotesQueryVariables = Exact<{
  first?: InputMaybe<Scalars["Int"]["input"]>;
  after?: InputMaybe<Scalars["String"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type QueryNotesQuery = {
  __typename?: "QueryType";
  notes?: {
    __typename?: "NotesConnection";
    totalCount: number;
    nodes?: Array<{
      __typename?: "ProcessedNote";
      id: string;
      transcriptId: string;
      profileId: string;
      version: number;
      source: NoteSource;
      title: string;
      summary: string;
      keyPoints: Array<string>;
      decisions: Array<string>;
      unresolvedQuestions: Array<string>;
      participants: Array<string>;
      topic: string;
      conversationType: ConversationType;
      cleanTranscript: string;
      fullTranscript: string;
      tags: Array<string>;
      markdownContent: string;
      exportedToVault: boolean;
      vaultPath?: string | null;
      createdAt: string;
      actionItems: Array<{
        __typename?: "ActionItem";
        person: string;
        task: string;
        deadline?: string | null;
      }>;
    }> | null;
    pageInfo: {
      __typename?: "PageInfo";
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string | null;
      endCursor?: string | null;
    };
  } | null;
};

export type QueryNoteQueryVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type QueryNoteQuery = {
  __typename?: "QueryType";
  note?: {
    __typename?: "ProcessedNote";
    id: string;
    transcriptId: string;
    profileId: string;
    version: number;
    source: NoteSource;
    title: string;
    summary: string;
    keyPoints: Array<string>;
    decisions: Array<string>;
    unresolvedQuestions: Array<string>;
    participants: Array<string>;
    topic: string;
    conversationType: ConversationType;
    cleanTranscript: string;
    fullTranscript: string;
    tags: Array<string>;
    markdownContent: string;
    exportedToVault: boolean;
    vaultPath?: string | null;
    createdAt: string;
    actionItems: Array<{
      __typename?: "ActionItem";
      person: string;
      task: string;
      deadline?: string | null;
    }>;
  } | null;
};

export type MutationDeleteNoteMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type MutationDeleteNoteMutation = {
  __typename?: "MutationType";
  deleteNote: {
    __typename?: "NotePayload";
    note?: { __typename?: "ProcessedNote"; id: string } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationCreateNoteMutationVariables = Exact<{
  input: CreateNoteInput;
}>;

export type MutationCreateNoteMutation = {
  __typename?: "MutationType";
  createNote: {
    __typename?: "NotePayload";
    note?: {
      __typename?: "ProcessedNote";
      id: string;
      title: string;
      topic: string;
      summary: string;
      source: NoteSource;
      markdownContent: string;
      exportedToVault: boolean;
      vaultPath?: string | null;
      tags: Array<string>;
      version: number;
      transcriptId: string;
      profileId: string;
      createdAt: string;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationExportNoteMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type MutationExportNoteMutation = {
  __typename?: "MutationType";
  exportNote: {
    __typename?: "NotePayload";
    note?: {
      __typename?: "ProcessedNote";
      id: string;
      exportedToVault: boolean;
      vaultPath?: string | null;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type QueryObsidianDetectQueryVariables = Exact<{ [key: string]: never }>;

export type QueryObsidianDetectQuery = {
  __typename?: "QueryType";
  obsidianDetect: {
    __typename?: "ObsidianDetectionResult";
    searched: Array<string>;
    detected: Array<{ __typename?: "ObsidianVaultEntry"; path: string; name: string }>;
  };
};

export type MutationSetupObsidianMutationVariables = Exact<{
  vaultPath?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type MutationSetupObsidianMutation = {
  __typename?: "MutationType";
  setupObsidian: {
    __typename?: "SetupObsidianPayload";
    report?: {
      __typename?: "ObsidianSetupReport";
      vaultPath: string;
      createdPaths: Array<string>;
      skippedPaths: Array<string>;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationObsidianRunDiagnosticsMutationVariables = Exact<{ [key: string]: never }>;

export type MutationObsidianRunDiagnosticsMutation = {
  __typename?: "MutationType";
  obsidianRunDiagnostics: {
    __typename?: "ObsidianDiagnosticsPayload";
    report?: {
      __typename?: "VaultDiagnosticsReport";
      snapshotId: string;
      generatedAt: string;
      isHealthy: boolean;
      vault: {
        __typename?: "VaultPathCheck";
        ok: boolean;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        vaultPath: string;
      };
      plugins: Array<{
        __typename?: "PluginCheck";
        pluginId: string;
        installed: boolean;
        enabled: boolean;
        hashMatches: boolean;
        optional: boolean;
        expectedVersion: string;
        installedVersion?: string | null;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        ok: boolean;
      }>;
      templater: {
        __typename?: "TemplaterSettingsCheck";
        ok: boolean;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        templatesFolder?: string | null;
        userScriptsFolder?: string | null;
      };
      bootstrap: {
        __typename?: "BootstrapDriftCheck";
        ok: boolean;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        files: Array<{
          __typename?: "BootstrapFileDrift";
          vaultRelativePath: string;
          status: BootstrapDriftStatus;
          expectedSha256: string;
          actualSha256?: string | null;
        }>;
      };
      restApi: {
        __typename?: "RestApiCheck";
        ok: boolean;
        required: boolean;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        host?: string | null;
        version?: string | null;
      };
      lmStudio: {
        __typename?: "LmStudioCheck";
        ok: boolean;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        endpoint?: string | null;
      };
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationObsidianRunWizardStepMutationVariables = Exact<{
  step: Scalars["Int"]["input"];
}>;

export type MutationObsidianRunWizardStepMutation = {
  __typename?: "MutationType";
  obsidianRunWizardStep: {
    __typename?: "ObsidianWizardStepPayload";
    currentStep: number;
    nextStep?: number | null;
    diagnostics?: {
      __typename?: "VaultDiagnosticsReport";
      snapshotId: string;
      generatedAt: string;
      isHealthy: boolean;
      vault: {
        __typename?: "VaultPathCheck";
        ok: boolean;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        vaultPath: string;
      };
      plugins: Array<{
        __typename?: "PluginCheck";
        pluginId: string;
        installed: boolean;
        enabled: boolean;
        hashMatches: boolean;
        optional: boolean;
        expectedVersion: string;
        installedVersion?: string | null;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        ok: boolean;
      }>;
      templater: {
        __typename?: "TemplaterSettingsCheck";
        ok: boolean;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        templatesFolder?: string | null;
        userScriptsFolder?: string | null;
      };
      bootstrap: {
        __typename?: "BootstrapDriftCheck";
        ok: boolean;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        files: Array<{
          __typename?: "BootstrapFileDrift";
          vaultRelativePath: string;
          status: BootstrapDriftStatus;
          expectedSha256: string;
          actualSha256?: string | null;
        }>;
      };
      restApi: {
        __typename?: "RestApiCheck";
        ok: boolean;
        required: boolean;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        host?: string | null;
        version?: string | null;
      };
      lmStudio: {
        __typename?: "LmStudioCheck";
        ok: boolean;
        severity: CheckSeverity;
        code: string;
        message: string;
        actions: Array<DiagnosticAction>;
        endpoint?: string | null;
      };
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationObsidianReapplyBootstrapMutationVariables = Exact<{ [key: string]: never }>;

export type MutationObsidianReapplyBootstrapMutation = {
  __typename?: "MutationType";
  obsidianReapplyBootstrap: {
    __typename?: "ObsidianReapplyBootstrapPayload";
    overwritten: Array<string>;
    skipped: Array<string>;
    backedUpTo?: string | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationObsidianReinstallPluginsMutationVariables = Exact<{ [key: string]: never }>;

export type MutationObsidianReinstallPluginsMutation = {
  __typename?: "MutationType";
  obsidianReinstallPlugins: {
    __typename?: "ObsidianReinstallPluginsPayload";
    reinstalled: Array<string>;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type QueryProfilesQueryVariables = Exact<{ [key: string]: never }>;

export type QueryProfilesQuery = {
  __typename?: "QueryType";
  profiles: Array<{
    __typename?: "Profile";
    id: string;
    name: string;
    systemPrompt: string;
    transcriptionPromptOverride: string;
    outputTemplate: string;
    cleanupLevel: CleanupLevel;
    exportFolder: string;
    autoTags: Array<string>;
    isDefault: boolean;
    isBuiltIn: boolean;
    llmCorrectionEnabled: boolean;
    llmProviderOverride: string;
    llmModelOverride: string;
    glossaryByLanguage: Array<{
      __typename?: "GlossaryEntry";
      language: string;
      terms: Array<string>;
    }>;
  }>;
};

export type MutationCreateProfileMutationVariables = Exact<{
  input: CreateProfileInput;
}>;

export type MutationCreateProfileMutation = {
  __typename?: "MutationType";
  createProfile: {
    __typename?: "ProfilePayload";
    profile?: {
      __typename?: "Profile";
      id: string;
      name: string;
      systemPrompt: string;
      transcriptionPromptOverride: string;
      outputTemplate: string;
      cleanupLevel: CleanupLevel;
      exportFolder: string;
      autoTags: Array<string>;
      isDefault: boolean;
      isBuiltIn: boolean;
      llmCorrectionEnabled: boolean;
      llmProviderOverride: string;
      llmModelOverride: string;
      glossaryByLanguage: Array<{
        __typename?: "GlossaryEntry";
        language: string;
        terms: Array<string>;
      }>;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationUpdateProfileMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
  input: CreateProfileInput;
}>;

export type MutationUpdateProfileMutation = {
  __typename?: "MutationType";
  updateProfile: {
    __typename?: "ProfilePayload";
    profile?: {
      __typename?: "Profile";
      id: string;
      name: string;
      systemPrompt: string;
      transcriptionPromptOverride: string;
      outputTemplate: string;
      cleanupLevel: CleanupLevel;
      exportFolder: string;
      autoTags: Array<string>;
      isDefault: boolean;
      isBuiltIn: boolean;
      llmCorrectionEnabled: boolean;
      llmProviderOverride: string;
      llmModelOverride: string;
      glossaryByLanguage: Array<{
        __typename?: "GlossaryEntry";
        language: string;
        terms: Array<string>;
      }>;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationDeleteProfileMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type MutationDeleteProfileMutation = {
  __typename?: "MutationType";
  deleteProfile: {
    __typename?: "ProfilePayload";
    profile?: { __typename?: "Profile"; id: string } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationDuplicateProfileMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type MutationDuplicateProfileMutation = {
  __typename?: "MutationType";
  duplicateProfile: {
    __typename?: "ProfilePayload";
    profile?: {
      __typename?: "Profile";
      id: string;
      name: string;
      systemPrompt: string;
      transcriptionPromptOverride: string;
      outputTemplate: string;
      cleanupLevel: CleanupLevel;
      exportFolder: string;
      autoTags: Array<string>;
      isDefault: boolean;
      isBuiltIn: boolean;
      llmCorrectionEnabled: boolean;
      llmProviderOverride: string;
      llmModelOverride: string;
      glossaryByLanguage: Array<{
        __typename?: "GlossaryEntry";
        language: string;
        terms: Array<string>;
      }>;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type SuggestGlossaryTermsQueryVariables = Exact<{
  profileId: Scalars["UUID"]["input"];
  language: Scalars["String"]["input"];
}>;

export type SuggestGlossaryTermsQuery = {
  __typename?: "QueryType";
  suggestGlossaryTerms: Array<string>;
};

export type QueryPromptTemplatesQueryVariables = Exact<{ [key: string]: never }>;

export type QueryPromptTemplatesQuery = {
  __typename?: "QueryType";
  promptTemplates: Array<{
    __typename?: "PromptTemplateDto";
    id: string;
    name: string;
    body: string;
    createdAt: string;
  }>;
};

export type QueryPromptTemplateQueryVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type QueryPromptTemplateQuery = {
  __typename?: "QueryType";
  promptTemplate?: {
    __typename?: "PromptTemplateDto";
    id: string;
    name: string;
    body: string;
    createdAt: string;
  } | null;
};

export type QueryPreviewPromptQueryVariables = Exact<{
  templateBody: Scalars["String"]["input"];
}>;

export type QueryPreviewPromptQuery = { __typename?: "QueryType"; previewPrompt: string };

export type MutationCreatePromptTemplateMutationVariables = Exact<{
  name: Scalars["String"]["input"];
  body: Scalars["String"]["input"];
}>;

export type MutationCreatePromptTemplateMutation = {
  __typename?: "MutationType";
  createPromptTemplate: {
    __typename?: "PromptTemplateDto";
    id: string;
    name: string;
    body: string;
    createdAt: string;
  };
};

export type MutationUpdatePromptTemplateMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
  name: Scalars["String"]["input"];
  body: Scalars["String"]["input"];
}>;

export type MutationUpdatePromptTemplateMutation = {
  __typename?: "MutationType";
  updatePromptTemplate?: {
    __typename?: "PromptTemplateDto";
    id: string;
    name: string;
    body: string;
    createdAt: string;
  } | null;
};

export type MutationDeletePromptTemplateMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type MutationDeletePromptTemplateMutation = {
  __typename?: "MutationType";
  deletePromptTemplate: boolean;
};

export type MutationBuildPromptMutationVariables = Exact<{
  template: Scalars["String"]["input"];
}>;

export type MutationBuildPromptMutation = { __typename?: "MutationType"; buildPrompt: string };

export type QueryRagStatusQueryVariables = Exact<{ [key: string]: never }>;

export type QueryRagStatusQuery = {
  __typename?: "QueryType";
  ragStatus: { __typename?: "RagIndexStatus"; embeddedNotes: number; chunks: number };
};

export type QueryRagQueryVariables = Exact<{
  question: Scalars["String"]["input"];
  topK?: InputMaybe<Scalars["Int"]["input"]>;
}>;

export type QueryRagQuery = {
  __typename?: "QueryType";
  ragQuery?: {
    __typename?: "RagQueryResult";
    answer: string;
    llmAvailable: boolean;
    citations: Array<{
      __typename?: "RagCitation";
      noteId: string;
      segmentId: string;
      text: string;
      snippet: string;
    }>;
  } | null;
};

export type MutationRagReindexMutationVariables = Exact<{ [key: string]: never }>;

export type MutationRagReindexMutation = {
  __typename?: "MutationType";
  ragReindex: {
    __typename?: "RagReindexPayload";
    embeddedNotes?: number | null;
    chunks?: number | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type SubscriptionRecordingPartialsSubscriptionVariables = Exact<{
  recordingId: Scalars["UUID"]["input"];
}>;

export type SubscriptionRecordingPartialsSubscription = {
  __typename?: "SubscriptionType";
  recordingPartials: {
    __typename?: "RecordingPartialPayload";
    recordingId: string;
    sessionId: string;
    text: string;
    startSeconds: number;
    endSeconds: number;
    isFinal: boolean;
    observedAt: string;
  };
};

export type QueryRecordingsQueryVariables = Exact<{
  first?: InputMaybe<Scalars["Int"]["input"]>;
  after?: InputMaybe<Scalars["String"]["input"]>;
  last?: InputMaybe<Scalars["Int"]["input"]>;
  before?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type QueryRecordingsQuery = {
  __typename?: "QueryType";
  recordings?: {
    __typename?: "RecordingsConnection";
    totalCount: number;
    nodes?: Array<{
      __typename?: "Recording";
      id: string;
      fileName: string;
      filePath: string;
      sha256: string;
      duration: any;
      format: AudioFormat;
      sourceType: SourceType;
      status: RecordingStatus;
      createdAt: string;
    }> | null;
    pageInfo: {
      __typename?: "PageInfo";
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string | null;
      endCursor?: string | null;
    };
  } | null;
};

export type QueryRecordingQueryVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type QueryRecordingQuery = {
  __typename?: "QueryType";
  recording?: {
    __typename?: "Recording";
    id: string;
    fileName: string;
    filePath: string;
    sha256: string;
    duration: any;
    format: AudioFormat;
    sourceType: SourceType;
    status: RecordingStatus;
    createdAt: string;
  } | null;
};

export type MutationImportRecordingsMutationVariables = Exact<{
  input: ImportRecordingsInput;
}>;

export type MutationImportRecordingsMutation = {
  __typename?: "MutationType";
  importRecordings: {
    __typename?: "ImportRecordingsPayload";
    recordings: Array<{
      __typename?: "Recording";
      id: string;
      fileName: string;
      status: RecordingStatus;
    }>;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationUploadRecordingsMutationVariables = Exact<{
  input: UploadRecordingsInput;
}>;

export type MutationUploadRecordingsMutation = {
  __typename?: "MutationType";
  uploadRecordings: {
    __typename?: "ImportRecordingsPayload";
    recordings: Array<{
      __typename?: "Recording";
      id: string;
      fileName: string;
      status: RecordingStatus;
    }>;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationDeleteRecordingMutationVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type MutationDeleteRecordingMutation = {
  __typename?: "MutationType";
  deleteRecording: {
    __typename?: "RecordingPayload";
    recording?: { __typename?: "Recording"; id: string } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type QueryRecordingWithNotesQueryVariables = Exact<{
  id: Scalars["UUID"]["input"];
}>;

export type QueryRecordingWithNotesQuery = {
  __typename?: "QueryType";
  recording?: {
    __typename?: "Recording";
    id: string;
    fileName: string;
    status: RecordingStatus;
    notes: Array<{
      __typename?: "ProcessedNote";
      id: string;
      title: string;
      topic: string;
      summary: string;
      createdAt: string;
      transcriptId: string;
      profileId: string;
      version: number;
      source: NoteSource;
      markdownContent: string;
      exportedToVault: boolean;
      vaultPath?: string | null;
      tags: Array<string>;
    }>;
  } | null;
};

export type MutationReprocessRecordingMutationVariables = Exact<{
  recordingId: Scalars["UUID"]["input"];
  profileId: Scalars["UUID"]["input"];
}>;

export type MutationReprocessRecordingMutation = {
  __typename?: "MutationType";
  reprocessRecording: {
    __typename?: "RecordingPayload";
    recording?: { __typename?: "Recording"; id: string } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationStartRecordingMutationVariables = Exact<{
  outputPath?: InputMaybe<Scalars["String"]["input"]>;
}>;

export type MutationStartRecordingMutation = {
  __typename?: "MutationType";
  startRecording: {
    __typename?: "StartRecordingPayload";
    sessionId?: string | null;
    recordingId?: string | null;
    dictationSessionId?: string | null;
    outputPath?: string | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type MutationStopRecordingMutationVariables = Exact<{
  sessionId: Scalars["String"]["input"];
}>;

export type MutationStopRecordingMutation = {
  __typename?: "MutationType";
  stopRecording: {
    __typename?: "StopRecordingPayload";
    sessionId?: string | null;
    recordings: Array<{
      __typename?: "Recording";
      id: string;
      fileName: string;
      status: RecordingStatus;
    }>;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type QueryRoutinesQueryVariables = Exact<{ [key: string]: never }>;

export type QueryRoutinesQuery = {
  __typename?: "QueryType";
  routines: Array<{
    __typename?: "RoutineDefinitionDto";
    key: string;
    displayName: string;
    description: string;
    isEnabled: boolean;
    lastRun?: {
      __typename?: "RoutineRunDto";
      id: string;
      routineKey: string;
      startedAt: string;
      finishedAt?: string | null;
      status: string;
      errorMessage?: string | null;
      payloadSummary?: string | null;
    } | null;
  }>;
};

export type QueryRoutineRunsQueryVariables = Exact<{
  key: Scalars["String"]["input"];
  limit: Scalars["Int"]["input"];
}>;

export type QueryRoutineRunsQuery = {
  __typename?: "QueryType";
  routineRuns: Array<{
    __typename?: "RoutineRunDto";
    id: string;
    routineKey: string;
    startedAt: string;
    finishedAt?: string | null;
    status: string;
    errorMessage?: string | null;
    payloadSummary?: string | null;
  }>;
};

export type MutationToggleRoutineMutationVariables = Exact<{
  key: Scalars["String"]["input"];
  enabled: Scalars["Boolean"]["input"];
}>;

export type MutationToggleRoutineMutation = {
  __typename?: "MutationType";
  toggleRoutine: {
    __typename?: "RoutineDefinitionDto";
    key: string;
    displayName: string;
    description: string;
    isEnabled: boolean;
    lastRun?: {
      __typename?: "RoutineRunDto";
      id: string;
      routineKey: string;
      startedAt: string;
      finishedAt?: string | null;
      status: string;
      errorMessage?: string | null;
      payloadSummary?: string | null;
    } | null;
  };
};

export type MutationRunRoutineNowMutationVariables = Exact<{
  key: Scalars["String"]["input"];
}>;

export type MutationRunRoutineNowMutation = {
  __typename?: "MutationType";
  runRoutineNow: {
    __typename?: "RoutineRunDto";
    id: string;
    routineKey: string;
    startedAt: string;
    finishedAt?: string | null;
    status: string;
    errorMessage?: string | null;
    payloadSummary?: string | null;
  };
};

export type QueryLlmCapabilitiesQueryVariables = Exact<{ [key: string]: never }>;

export type QueryLlmCapabilitiesQuery = {
  __typename?: "QueryType";
  llmCapabilities?: {
    __typename?: "LlmCapabilities";
    supportsToolCalling: boolean;
    supportsJsonMode: boolean;
    ctxLength: number;
    tokensPerSecond: number;
    probedAt: string;
  } | null;
};

export type QuerySettingsQueryVariables = Exact<{ [key: string]: never }>;

export type QuerySettingsQuery = {
  __typename?: "QueryType";
  settings: {
    __typename?: "AppSettingsDto";
    vaultPath: string;
    llmProvider: string;
    llmEndpoint: string;
    llmModel: string;
    llmApiKey: string;
    obsidianApiHost: string;
    obsidianApiToken: string;
    whisperModelPath: string;
    vadModelPath: string;
    language: string;
    themeMode: string;
    whisperThreads: number;
    dictationEnabled: boolean;
    dictationHotkeyType: string;
    dictationMouseButton: number;
    dictationKeyboardHotkey: string;
    dictationLanguage: string;
    dictationWhisperModelId: string;
    dictationCaptureSampleRate: number;
    dictationLlmPolish: boolean;
    dictationInjectMode: string;
    dictationOverlayEnabled: boolean;
    dictationOverlayPosition: string;
    dictationSoundFeedback: boolean;
    dictationVocabulary: Array<string>;
    dictationModelUnloadMinutes: number;
    dictationTempAudioPath: string;
    dictationPushToTalk: boolean;
    syncthingEnabled: boolean;
    syncthingObsidianVaultPath: string;
    syncthingApiKey: string;
    syncthingBaseUrl: string;
    obsidianFeatureEnabled: boolean;
    dictationDumpEnabled: boolean;
    dictationDumpHotkeyToggle: string;
    dictationDumpHotkeyHold: string;
    webCacheTtlHours: number;
    mcpServerEnabled: boolean;
    mcpServerPort: number;
    mcpServerToken: string;
    actionsSkillEnabled: boolean;
    remindersSkillEnabled: boolean;
    dictationClassifyIntentEnabled: boolean;
    claudeCliPath: string;
    sidecarEnrichmentEnabled: boolean;
    dictationAppProfiles: Array<{
      __typename?: "KeyValuePairOfStringAndString";
      key: string;
      value: string;
    }>;
  };
};

export type MutationUpdateSettingsMutationVariables = Exact<{
  input: UpdateSettingsInput;
}>;

export type MutationUpdateSettingsMutation = {
  __typename?: "MutationType";
  updateSettings: {
    __typename?: "UpdateSettingsPayload";
    settings?: {
      __typename?: "AppSettingsDto";
      vaultPath: string;
      llmProvider: string;
      llmEndpoint: string;
      llmModel: string;
      llmApiKey: string;
      obsidianApiHost: string;
      obsidianApiToken: string;
      whisperModelPath: string;
      vadModelPath: string;
      language: string;
      themeMode: string;
      whisperThreads: number;
      dictationEnabled: boolean;
      dictationHotkeyType: string;
      dictationMouseButton: number;
      dictationKeyboardHotkey: string;
      dictationLanguage: string;
      dictationWhisperModelId: string;
      dictationCaptureSampleRate: number;
      dictationLlmPolish: boolean;
      dictationInjectMode: string;
      dictationOverlayEnabled: boolean;
      dictationOverlayPosition: string;
      dictationSoundFeedback: boolean;
      dictationVocabulary: Array<string>;
      dictationModelUnloadMinutes: number;
      dictationTempAudioPath: string;
      dictationPushToTalk: boolean;
      syncthingEnabled: boolean;
      syncthingObsidianVaultPath: string;
      syncthingApiKey: string;
      syncthingBaseUrl: string;
      obsidianFeatureEnabled: boolean;
      dictationDumpEnabled: boolean;
      dictationDumpHotkeyToggle: string;
      dictationDumpHotkeyHold: string;
      webCacheTtlHours: number;
      mcpServerEnabled: boolean;
      mcpServerPort: number;
      mcpServerToken: string;
      actionsSkillEnabled: boolean;
      remindersSkillEnabled: boolean;
      dictationClassifyIntentEnabled: boolean;
      claudeCliPath: string;
      sidecarEnrichmentEnabled: boolean;
      dictationAppProfiles: Array<{
        __typename?: "KeyValuePairOfStringAndString";
        key: string;
        value: string;
      }>;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type QuerySyncStatusQueryVariables = Exact<{ [key: string]: never }>;

export type QuerySyncStatusQuery = {
  __typename?: "QueryType";
  syncStatus?: {
    __typename?: "SyncStatusResult";
    folders: Array<{
      __typename?: "SyncFolderEntry";
      id: string;
      state: string;
      completionPct: number;
      conflicts: number;
    }>;
    devices: Array<{
      __typename?: "SyncDeviceEntry";
      id: string;
      name: string;
      connected: boolean;
      lastSeen?: string | null;
    }>;
  } | null;
};

export type QuerySyncHealthQueryVariables = Exact<{ [key: string]: never }>;

export type QuerySyncHealthQuery = { __typename?: "QueryType"; syncHealth: boolean };

export type QuerySyncPairingPayloadQueryVariables = Exact<{ [key: string]: never }>;

export type QuerySyncPairingPayloadQuery = {
  __typename?: "QueryType";
  syncPairingPayload?: {
    __typename?: "SyncPairingPayloadResult";
    deviceId: string;
    folderIds: Array<string>;
    uri: string;
  } | null;
};

export type MutationAcceptSyncDeviceMutationVariables = Exact<{
  deviceId: Scalars["String"]["input"];
  name?: InputMaybe<Scalars["String"]["input"]>;
  folderIds?: InputMaybe<Array<Scalars["String"]["input"]> | Scalars["String"]["input"]>;
}>;

export type MutationAcceptSyncDeviceMutation = {
  __typename?: "MutationType";
  acceptSyncDevice: {
    __typename?: "AcceptSyncDevicePayload";
    accepted: boolean;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export type SubscriptionSyncEventsSubscriptionVariables = Exact<{ [key: string]: never }>;

export type SubscriptionSyncEventsSubscription = {
  __typename?: "SubscriptionType";
  syncEvents: {
    __typename?: "SyncEventMessage";
    id: any;
    type: string;
    time: string;
    folderCompletion?: {
      __typename?: "FolderCompletionPayload";
      folder: string;
      device: string;
      completion: number;
      needBytes: any;
      globalBytes: any;
    } | null;
    deviceConnection?: {
      __typename?: "DeviceConnectionPayload";
      deviceId: string;
      connected: boolean;
      address?: string | null;
      error?: string | null;
    } | null;
    pendingDevices?: {
      __typename?: "PendingDevicesPayload";
      removed: Array<string>;
      added: Array<{
        __typename?: "PendingDeviceEntry";
        deviceId: string;
        name?: string | null;
        address?: string | null;
      }>;
    } | null;
    fileConflict?: { __typename?: "FileConflictPayload"; folder: string; path: string } | null;
  };
};

export type QuerySystemActionTemplatesQueryVariables = Exact<{ [key: string]: never }>;

export type QuerySystemActionTemplatesQuery = {
  __typename?: "QueryType";
  systemActionTemplates: Array<{
    __typename?: "SystemActionTemplateDto";
    name: string;
    description: string;
    deeplinkUrl: string;
  }>;
};

export type QueryWebSearchConfigQueryVariables = Exact<{ [key: string]: never }>;

export type QueryWebSearchConfigQuery = {
  __typename?: "QueryType";
  webSearchConfig: {
    __typename?: "WebSearchConfigDto";
    ddgEnabled: boolean;
    yandexEnabled: boolean;
    googleEnabled: boolean;
    cacheTtlHours: number;
    rawSettingsYaml: string;
  };
};

export type MutationUpdateWebSearchConfigMutationVariables = Exact<{
  input: WebSearchConfigInput;
}>;

export type MutationUpdateWebSearchConfigMutation = {
  __typename?: "MutationType";
  updateWebSearchConfig: {
    __typename?: "WebSearchConfigPayload";
    config?: {
      __typename?: "WebSearchConfigDto";
      ddgEnabled: boolean;
      yandexEnabled: boolean;
      googleEnabled: boolean;
      cacheTtlHours: number;
      rawSettingsYaml: string;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
  };
};

export const UnifiedSearchDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "UnifiedSearch" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "query" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "includeWeb" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "unifiedSearch" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "query" },
                value: { kind: "Variable", name: { kind: "Name", value: "query" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "includeWeb" },
                value: { kind: "Variable", name: { kind: "Name", value: "includeWeb" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "answer" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "citations" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "source" } },
                      { kind: "Field", name: { kind: "Name", value: "reference" } },
                      { kind: "Field", name: { kind: "Name", value: "snippet" } },
                      { kind: "Field", name: { kind: "Name", value: "url" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<UnifiedSearchQuery, UnifiedSearchQueryVariables>;
export const QueryBackupsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryBackups" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "backups" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "path" } },
                { kind: "Field", name: { kind: "Name", value: "sizeBytes" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryBackupsQuery, QueryBackupsQueryVariables>;
export const MutationCreateBackupDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationCreateBackup" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createBackup" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "backup" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "path" } },
                      { kind: "Field", name: { kind: "Name", value: "sizeBytes" } },
                      { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationCreateBackupMutation, MutationCreateBackupMutationVariables>;
export const QueryDictationAudioCapabilitiesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryDictationAudioCapabilities" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "dictationAudioCapabilities" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "isSupported" } },
                { kind: "Field", name: { kind: "Name", value: "detectedPlatform" } },
                { kind: "Field", name: { kind: "Name", value: "permissionsRequired" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  QueryDictationAudioCapabilitiesQuery,
  QueryDictationAudioCapabilitiesQueryVariables
>;
export const QueryDictationStatusDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryDictationStatus" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "sessionId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "dictationStatus" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "sessionId" },
                value: { kind: "Variable", name: { kind: "Name", value: "sessionId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "sessionId" } },
                { kind: "Field", name: { kind: "Name", value: "state" } },
                { kind: "Field", name: { kind: "Name", value: "source" } },
                { kind: "Field", name: { kind: "Name", value: "startedAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryDictationStatusQuery, QueryDictationStatusQueryVariables>;
export const MutationDictationStartDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationDictationStart" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "source" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "recordingId" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "dictationStart" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "source" },
                value: { kind: "Variable", name: { kind: "Name", value: "source" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "recordingId" },
                value: { kind: "Variable", name: { kind: "Name", value: "recordingId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "sessionId" } },
                { kind: "Field", name: { kind: "Name", value: "source" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationDictationStartMutation,
  MutationDictationStartMutationVariables
>;
export const MutationDictationStopDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationDictationStop" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "sessionId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "bundleId" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "dictationStop" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "sessionId" },
                value: { kind: "Variable", name: { kind: "Name", value: "sessionId" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "bundleId" },
                value: { kind: "Variable", name: { kind: "Name", value: "bundleId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "rawText" } },
                { kind: "Field", name: { kind: "Name", value: "polishedText" } },
                { kind: "Field", name: { kind: "Name", value: "durationMs" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationDictationStopMutation, MutationDictationStopMutationVariables>;
export const MutationDictationCancelDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationDictationCancel" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "sessionId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "dictationCancel" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "sessionId" },
                value: { kind: "Variable", name: { kind: "Name", value: "sessionId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationDictationCancelMutation,
  MutationDictationCancelMutationVariables
>;
export const SubscriptionDictationEventsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "SubscriptionDictationEvents" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "sessionId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "dictationEvents" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "sessionId" },
                value: { kind: "Variable", name: { kind: "Name", value: "sessionId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "sessionId" } },
                { kind: "Field", name: { kind: "Name", value: "text" } },
                { kind: "Field", name: { kind: "Name", value: "timestampMs" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SubscriptionDictationEventsSubscription,
  SubscriptionDictationEventsSubscriptionVariables
>;
export const SubscriptionAudioDeviceChangedDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "SubscriptionAudioDeviceChanged" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "audioDeviceChanged" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "kind" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "devices" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "isDefault" } },
                    ],
                  },
                },
                { kind: "Field", name: { kind: "Name", value: "observedAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SubscriptionAudioDeviceChangedSubscription,
  SubscriptionAudioDeviceChangedSubscriptionVariables
>;
export const SubscriptionHotkeyEventsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "SubscriptionHotkeyEvents" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "hotkeyEvents" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "kind" } },
                { kind: "Field", name: { kind: "Name", value: "accelerator" } },
                { kind: "Field", name: { kind: "Name", value: "observedAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SubscriptionHotkeyEventsSubscription,
  SubscriptionHotkeyEventsSubscriptionVariables
>;
export const QueryHealthDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryHealth" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "health" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "status" } },
                { kind: "Field", name: { kind: "Name", value: "time" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryHealthQuery, QueryHealthQueryVariables>;
export const QueryLlmHealthDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryLlmHealth" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "llmHealth" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "available" } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryLlmHealthQuery, QueryLlmHealthQueryVariables>;
export const QueryMetaDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryMeta" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "meta" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "version" } },
                { kind: "Field", name: { kind: "Name", value: "assemblyVersion" } },
                { kind: "Field", name: { kind: "Name", value: "commit" } },
                { kind: "Field", name: { kind: "Name", value: "buildDate" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryMetaQuery, QueryMetaQueryVariables>;
export const QueryJobsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryJobs" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "first" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "after" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "jobs" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "first" },
                value: { kind: "Variable", name: { kind: "Name", value: "first" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "after" },
                value: { kind: "Variable", name: { kind: "Name", value: "after" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "nodes" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "recordingId" } },
                      { kind: "Field", name: { kind: "Name", value: "profileId" } },
                      { kind: "Field", name: { kind: "Name", value: "status" } },
                      { kind: "Field", name: { kind: "Name", value: "progress" } },
                      { kind: "Field", name: { kind: "Name", value: "currentStep" } },
                      { kind: "Field", name: { kind: "Name", value: "errorMessage" } },
                      { kind: "Field", name: { kind: "Name", value: "userHint" } },
                      { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                      { kind: "Field", name: { kind: "Name", value: "startedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "finishedAt" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pageInfo" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "hasNextPage" } },
                      { kind: "Field", name: { kind: "Name", value: "endCursor" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryJobsQuery, QueryJobsQueryVariables>;
export const QueryActiveJobsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryActiveJobs" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "activeJobs" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "recordingId" } },
                { kind: "Field", name: { kind: "Name", value: "profileId" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                { kind: "Field", name: { kind: "Name", value: "progress" } },
                { kind: "Field", name: { kind: "Name", value: "currentStep" } },
                { kind: "Field", name: { kind: "Name", value: "errorMessage" } },
                { kind: "Field", name: { kind: "Name", value: "userHint" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                { kind: "Field", name: { kind: "Name", value: "startedAt" } },
                { kind: "Field", name: { kind: "Name", value: "finishedAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryActiveJobsQuery, QueryActiveJobsQueryVariables>;
export const MutationEnqueueJobDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationEnqueueJob" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "EnqueueJobInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "enqueueJob" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "job" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "recordingId" } },
                      { kind: "Field", name: { kind: "Name", value: "profileId" } },
                      { kind: "Field", name: { kind: "Name", value: "status" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationEnqueueJobMutation, MutationEnqueueJobMutationVariables>;
export const MutationCancelJobDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationCancelJob" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "cancelJob" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationCancelJobMutation, MutationCancelJobMutationVariables>;
export const MutationPauseJobDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationPauseJob" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "pauseJob" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationPauseJobMutation, MutationPauseJobMutationVariables>;
export const MutationResumeJobDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationResumeJob" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "resumeJob" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "job" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "recordingId" } },
                      { kind: "Field", name: { kind: "Name", value: "profileId" } },
                      { kind: "Field", name: { kind: "Name", value: "status" } },
                      { kind: "Field", name: { kind: "Name", value: "progress" } },
                      { kind: "Field", name: { kind: "Name", value: "currentStep" } },
                      { kind: "Field", name: { kind: "Name", value: "errorMessage" } },
                      { kind: "Field", name: { kind: "Name", value: "userHint" } },
                      { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                      { kind: "Field", name: { kind: "Name", value: "startedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "finishedAt" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationResumeJobMutation, MutationResumeJobMutationVariables>;
export const MutationRetryJobFromStageDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationRetryJobFromStage" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "RetryJobFromStageInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "retryJobFromStage" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "job" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "recordingId" } },
                      { kind: "Field", name: { kind: "Name", value: "profileId" } },
                      { kind: "Field", name: { kind: "Name", value: "status" } },
                      { kind: "Field", name: { kind: "Name", value: "progress" } },
                      { kind: "Field", name: { kind: "Name", value: "currentStep" } },
                      { kind: "Field", name: { kind: "Name", value: "errorMessage" } },
                      { kind: "Field", name: { kind: "Name", value: "userHint" } },
                      { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                      { kind: "Field", name: { kind: "Name", value: "startedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "finishedAt" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationRetryJobFromStageMutation,
  MutationRetryJobFromStageMutationVariables
>;
export const SubscriptionJobProgressDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "SubscriptionJobProgress" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "jobProgress" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "recordingId" } },
                { kind: "Field", name: { kind: "Name", value: "profileId" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                { kind: "Field", name: { kind: "Name", value: "progress" } },
                { kind: "Field", name: { kind: "Name", value: "currentStep" } },
                { kind: "Field", name: { kind: "Name", value: "errorMessage" } },
                { kind: "Field", name: { kind: "Name", value: "userHint" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                { kind: "Field", name: { kind: "Name", value: "startedAt" } },
                { kind: "Field", name: { kind: "Name", value: "finishedAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SubscriptionJobProgressSubscription,
  SubscriptionJobProgressSubscriptionVariables
>;
export const QueryLlmModelsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryLlmModels" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "llmModels" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "ownedBy" } },
                { kind: "Field", name: { kind: "Name", value: "contextLength" } },
                { kind: "Field", name: { kind: "Name", value: "supportsToolCalling" } },
                { kind: "Field", name: { kind: "Name", value: "supportsJsonMode" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryLlmModelsQuery, QueryLlmModelsQueryVariables>;
export const MutationImportFromMeetilyDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationImportFromMeetily" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "meetilyDatabasePath" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "importFromMeetily" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "meetilyDatabasePath" },
                value: { kind: "Variable", name: { kind: "Name", value: "meetilyDatabasePath" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "totalMeetings" } },
                { kind: "Field", name: { kind: "Name", value: "importedRecordings" } },
                { kind: "Field", name: { kind: "Name", value: "skippedDuplicates" } },
                { kind: "Field", name: { kind: "Name", value: "importErrors" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationImportFromMeetilyMutation,
  MutationImportFromMeetilyMutationVariables
>;
export const QueryModelsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryModels" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "models" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "description" } },
                { kind: "Field", name: { kind: "Name", value: "url" } },
                { kind: "Field", name: { kind: "Name", value: "sizeMb" } },
                { kind: "Field", name: { kind: "Name", value: "kind" } },
                { kind: "Field", name: { kind: "Name", value: "tier" } },
                { kind: "Field", name: { kind: "Name", value: "isDefault" } },
                { kind: "Field", name: { kind: "Name", value: "destinationPath" } },
                { kind: "Field", name: { kind: "Name", value: "installed" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryModelsQuery, QueryModelsQueryVariables>;
export const MutationDownloadModelDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationDownloadModel" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "catalogueId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "downloadModel" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "catalogueId" },
                value: { kind: "Variable", name: { kind: "Name", value: "catalogueId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "downloadId" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationDownloadModelMutation, MutationDownloadModelMutationVariables>;
export const SubscriptionModelDownloadProgressDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "SubscriptionModelDownloadProgress" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "downloadId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "modelDownloadProgress" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "downloadId" },
                value: { kind: "Variable", name: { kind: "Name", value: "downloadId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "downloadId" } },
                { kind: "Field", name: { kind: "Name", value: "bytesRead" } },
                { kind: "Field", name: { kind: "Name", value: "totalBytes" } },
                { kind: "Field", name: { kind: "Name", value: "done" } },
                { kind: "Field", name: { kind: "Name", value: "error" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SubscriptionModelDownloadProgressSubscription,
  SubscriptionModelDownloadProgressSubscriptionVariables
>;
export const QueryRuntimeStateDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryRuntimeState" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "runtimeState" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "llm" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "endpoint" } },
                      { kind: "Field", name: { kind: "Name", value: "online" } },
                      { kind: "Field", name: { kind: "Name", value: "lastProbedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "model" } },
                      { kind: "Field", name: { kind: "Name", value: "contextLength" } },
                      { kind: "Field", name: { kind: "Name", value: "supportsToolCalling" } },
                      { kind: "Field", name: { kind: "Name", value: "supportsJsonMode" } },
                      { kind: "Field", name: { kind: "Name", value: "lastError" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "syncthing" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "detection" } },
                      { kind: "Field", name: { kind: "Name", value: "binaryPath" } },
                      { kind: "Field", name: { kind: "Name", value: "apiUrl" } },
                      { kind: "Field", name: { kind: "Name", value: "version" } },
                      { kind: "Field", name: { kind: "Name", value: "hint" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "services" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "state" } },
                      { kind: "Field", name: { kind: "Name", value: "lastError" } },
                      { kind: "Field", name: { kind: "Name", value: "restartCount" } },
                      { kind: "Field", name: { kind: "Name", value: "pid" } },
                      { kind: "Field", name: { kind: "Name", value: "port" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryRuntimeStateQuery, QueryRuntimeStateQueryVariables>;
export const SubscriptionRuntimeStateChangedDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "SubscriptionRuntimeStateChanged" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "runtimeStateChanged" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "llm" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "endpoint" } },
                      { kind: "Field", name: { kind: "Name", value: "online" } },
                      { kind: "Field", name: { kind: "Name", value: "lastProbedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "model" } },
                      { kind: "Field", name: { kind: "Name", value: "contextLength" } },
                      { kind: "Field", name: { kind: "Name", value: "supportsToolCalling" } },
                      { kind: "Field", name: { kind: "Name", value: "supportsJsonMode" } },
                      { kind: "Field", name: { kind: "Name", value: "lastError" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "syncthing" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "detection" } },
                      { kind: "Field", name: { kind: "Name", value: "binaryPath" } },
                      { kind: "Field", name: { kind: "Name", value: "apiUrl" } },
                      { kind: "Field", name: { kind: "Name", value: "version" } },
                      { kind: "Field", name: { kind: "Name", value: "hint" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "services" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "state" } },
                      { kind: "Field", name: { kind: "Name", value: "lastError" } },
                      { kind: "Field", name: { kind: "Name", value: "restartCount" } },
                      { kind: "Field", name: { kind: "Name", value: "pid" } },
                      { kind: "Field", name: { kind: "Name", value: "port" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SubscriptionRuntimeStateChangedSubscription,
  SubscriptionRuntimeStateChangedSubscriptionVariables
>;
export const MutationReprobeRuntimeStateDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationReprobeRuntimeState" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "reprobeRuntimeState" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "state" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "llm" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "endpoint" } },
                            { kind: "Field", name: { kind: "Name", value: "online" } },
                            { kind: "Field", name: { kind: "Name", value: "lastProbedAt" } },
                            { kind: "Field", name: { kind: "Name", value: "model" } },
                            { kind: "Field", name: { kind: "Name", value: "contextLength" } },
                            { kind: "Field", name: { kind: "Name", value: "supportsToolCalling" } },
                            { kind: "Field", name: { kind: "Name", value: "supportsJsonMode" } },
                            { kind: "Field", name: { kind: "Name", value: "lastError" } },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "syncthing" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "detection" } },
                            { kind: "Field", name: { kind: "Name", value: "binaryPath" } },
                            { kind: "Field", name: { kind: "Name", value: "apiUrl" } },
                            { kind: "Field", name: { kind: "Name", value: "version" } },
                            { kind: "Field", name: { kind: "Name", value: "hint" } },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "services" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "name" } },
                            { kind: "Field", name: { kind: "Name", value: "state" } },
                            { kind: "Field", name: { kind: "Name", value: "lastError" } },
                            { kind: "Field", name: { kind: "Name", value: "restartCount" } },
                            { kind: "Field", name: { kind: "Name", value: "pid" } },
                            { kind: "Field", name: { kind: "Name", value: "port" } },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationReprobeRuntimeStateMutation,
  MutationReprobeRuntimeStateMutationVariables
>;
export const MutationPublishElectronServicesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationPublishElectronServices" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: {
              kind: "NamedType",
              name: { kind: "Name", value: "PublishElectronServicesInput" },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "publishElectronServices" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "state" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "services" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "name" } },
                            { kind: "Field", name: { kind: "Name", value: "state" } },
                            { kind: "Field", name: { kind: "Name", value: "lastError" } },
                            { kind: "Field", name: { kind: "Name", value: "restartCount" } },
                            { kind: "Field", name: { kind: "Name", value: "pid" } },
                            { kind: "Field", name: { kind: "Name", value: "port" } },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationPublishElectronServicesMutation,
  MutationPublishElectronServicesMutationVariables
>;
export const QueryNotesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryNotes" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "first" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "after" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "last" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "before" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "notes" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "first" },
                value: { kind: "Variable", name: { kind: "Name", value: "first" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "after" },
                value: { kind: "Variable", name: { kind: "Name", value: "after" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "last" },
                value: { kind: "Variable", name: { kind: "Name", value: "last" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "before" },
                value: { kind: "Variable", name: { kind: "Name", value: "before" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "totalCount" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "nodes" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "transcriptId" } },
                      { kind: "Field", name: { kind: "Name", value: "profileId" } },
                      { kind: "Field", name: { kind: "Name", value: "version" } },
                      { kind: "Field", name: { kind: "Name", value: "source" } },
                      { kind: "Field", name: { kind: "Name", value: "title" } },
                      { kind: "Field", name: { kind: "Name", value: "summary" } },
                      { kind: "Field", name: { kind: "Name", value: "keyPoints" } },
                      { kind: "Field", name: { kind: "Name", value: "decisions" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "actionItems" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "person" } },
                            { kind: "Field", name: { kind: "Name", value: "task" } },
                            { kind: "Field", name: { kind: "Name", value: "deadline" } },
                          ],
                        },
                      },
                      { kind: "Field", name: { kind: "Name", value: "unresolvedQuestions" } },
                      { kind: "Field", name: { kind: "Name", value: "participants" } },
                      { kind: "Field", name: { kind: "Name", value: "topic" } },
                      { kind: "Field", name: { kind: "Name", value: "conversationType" } },
                      { kind: "Field", name: { kind: "Name", value: "cleanTranscript" } },
                      { kind: "Field", name: { kind: "Name", value: "fullTranscript" } },
                      { kind: "Field", name: { kind: "Name", value: "tags" } },
                      { kind: "Field", name: { kind: "Name", value: "markdownContent" } },
                      { kind: "Field", name: { kind: "Name", value: "exportedToVault" } },
                      { kind: "Field", name: { kind: "Name", value: "vaultPath" } },
                      { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pageInfo" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "hasNextPage" } },
                      { kind: "Field", name: { kind: "Name", value: "hasPreviousPage" } },
                      { kind: "Field", name: { kind: "Name", value: "startCursor" } },
                      { kind: "Field", name: { kind: "Name", value: "endCursor" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryNotesQuery, QueryNotesQueryVariables>;
export const QueryNoteDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryNote" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "note" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "transcriptId" } },
                { kind: "Field", name: { kind: "Name", value: "profileId" } },
                { kind: "Field", name: { kind: "Name", value: "version" } },
                { kind: "Field", name: { kind: "Name", value: "source" } },
                { kind: "Field", name: { kind: "Name", value: "title" } },
                { kind: "Field", name: { kind: "Name", value: "summary" } },
                { kind: "Field", name: { kind: "Name", value: "keyPoints" } },
                { kind: "Field", name: { kind: "Name", value: "decisions" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "actionItems" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "person" } },
                      { kind: "Field", name: { kind: "Name", value: "task" } },
                      { kind: "Field", name: { kind: "Name", value: "deadline" } },
                    ],
                  },
                },
                { kind: "Field", name: { kind: "Name", value: "unresolvedQuestions" } },
                { kind: "Field", name: { kind: "Name", value: "participants" } },
                { kind: "Field", name: { kind: "Name", value: "topic" } },
                { kind: "Field", name: { kind: "Name", value: "conversationType" } },
                { kind: "Field", name: { kind: "Name", value: "cleanTranscript" } },
                { kind: "Field", name: { kind: "Name", value: "fullTranscript" } },
                { kind: "Field", name: { kind: "Name", value: "tags" } },
                { kind: "Field", name: { kind: "Name", value: "markdownContent" } },
                { kind: "Field", name: { kind: "Name", value: "exportedToVault" } },
                { kind: "Field", name: { kind: "Name", value: "vaultPath" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryNoteQuery, QueryNoteQueryVariables>;
export const MutationDeleteNoteDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationDeleteNote" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "deleteNote" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "note" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationDeleteNoteMutation, MutationDeleteNoteMutationVariables>;
export const MutationCreateNoteDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationCreateNote" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "CreateNoteInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createNote" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "note" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "title" } },
                      { kind: "Field", name: { kind: "Name", value: "topic" } },
                      { kind: "Field", name: { kind: "Name", value: "summary" } },
                      { kind: "Field", name: { kind: "Name", value: "source" } },
                      { kind: "Field", name: { kind: "Name", value: "markdownContent" } },
                      { kind: "Field", name: { kind: "Name", value: "exportedToVault" } },
                      { kind: "Field", name: { kind: "Name", value: "vaultPath" } },
                      { kind: "Field", name: { kind: "Name", value: "tags" } },
                      { kind: "Field", name: { kind: "Name", value: "version" } },
                      { kind: "Field", name: { kind: "Name", value: "transcriptId" } },
                      { kind: "Field", name: { kind: "Name", value: "profileId" } },
                      { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationCreateNoteMutation, MutationCreateNoteMutationVariables>;
export const MutationExportNoteDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationExportNote" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "exportNote" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "note" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "exportedToVault" } },
                      { kind: "Field", name: { kind: "Name", value: "vaultPath" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationExportNoteMutation, MutationExportNoteMutationVariables>;
export const QueryObsidianDetectDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryObsidianDetect" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "obsidianDetect" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "detected" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "path" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                    ],
                  },
                },
                { kind: "Field", name: { kind: "Name", value: "searched" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryObsidianDetectQuery, QueryObsidianDetectQueryVariables>;
export const MutationSetupObsidianDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationSetupObsidian" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "vaultPath" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "setupObsidian" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "vaultPath" },
                value: { kind: "Variable", name: { kind: "Name", value: "vaultPath" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "report" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "vaultPath" } },
                      { kind: "Field", name: { kind: "Name", value: "createdPaths" } },
                      { kind: "Field", name: { kind: "Name", value: "skippedPaths" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationSetupObsidianMutation, MutationSetupObsidianMutationVariables>;
export const MutationObsidianRunDiagnosticsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationObsidianRunDiagnostics" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "obsidianRunDiagnostics" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "report" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "snapshotId" } },
                      { kind: "Field", name: { kind: "Name", value: "generatedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "vault" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            { kind: "Field", name: { kind: "Name", value: "vaultPath" } },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "plugins" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "pluginId" } },
                            { kind: "Field", name: { kind: "Name", value: "installed" } },
                            { kind: "Field", name: { kind: "Name", value: "enabled" } },
                            { kind: "Field", name: { kind: "Name", value: "hashMatches" } },
                            { kind: "Field", name: { kind: "Name", value: "optional" } },
                            { kind: "Field", name: { kind: "Name", value: "expectedVersion" } },
                            { kind: "Field", name: { kind: "Name", value: "installedVersion" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "templater" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            { kind: "Field", name: { kind: "Name", value: "templatesFolder" } },
                            { kind: "Field", name: { kind: "Name", value: "userScriptsFolder" } },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "bootstrap" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "files" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "vaultRelativePath" },
                                  },
                                  { kind: "Field", name: { kind: "Name", value: "status" } },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "expectedSha256" },
                                  },
                                  { kind: "Field", name: { kind: "Name", value: "actualSha256" } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "restApi" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                            { kind: "Field", name: { kind: "Name", value: "required" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            { kind: "Field", name: { kind: "Name", value: "host" } },
                            { kind: "Field", name: { kind: "Name", value: "version" } },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "lmStudio" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            { kind: "Field", name: { kind: "Name", value: "endpoint" } },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationObsidianRunDiagnosticsMutation,
  MutationObsidianRunDiagnosticsMutationVariables
>;
export const MutationObsidianRunWizardStepDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationObsidianRunWizardStep" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "step" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "obsidianRunWizardStep" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "step" },
                value: { kind: "Variable", name: { kind: "Name", value: "step" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "currentStep" } },
                { kind: "Field", name: { kind: "Name", value: "nextStep" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "diagnostics" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "snapshotId" } },
                      { kind: "Field", name: { kind: "Name", value: "generatedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "isHealthy" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "vault" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            { kind: "Field", name: { kind: "Name", value: "vaultPath" } },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "plugins" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "pluginId" } },
                            { kind: "Field", name: { kind: "Name", value: "installed" } },
                            { kind: "Field", name: { kind: "Name", value: "enabled" } },
                            { kind: "Field", name: { kind: "Name", value: "hashMatches" } },
                            { kind: "Field", name: { kind: "Name", value: "optional" } },
                            { kind: "Field", name: { kind: "Name", value: "expectedVersion" } },
                            { kind: "Field", name: { kind: "Name", value: "installedVersion" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "templater" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            { kind: "Field", name: { kind: "Name", value: "templatesFolder" } },
                            { kind: "Field", name: { kind: "Name", value: "userScriptsFolder" } },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "bootstrap" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            {
                              kind: "Field",
                              name: { kind: "Name", value: "files" },
                              selectionSet: {
                                kind: "SelectionSet",
                                selections: [
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "vaultRelativePath" },
                                  },
                                  { kind: "Field", name: { kind: "Name", value: "status" } },
                                  {
                                    kind: "Field",
                                    name: { kind: "Name", value: "expectedSha256" },
                                  },
                                  { kind: "Field", name: { kind: "Name", value: "actualSha256" } },
                                ],
                              },
                            },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "restApi" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                            { kind: "Field", name: { kind: "Name", value: "required" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            { kind: "Field", name: { kind: "Name", value: "host" } },
                            { kind: "Field", name: { kind: "Name", value: "version" } },
                          ],
                        },
                      },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "lmStudio" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "ok" } },
                            { kind: "Field", name: { kind: "Name", value: "severity" } },
                            { kind: "Field", name: { kind: "Name", value: "code" } },
                            { kind: "Field", name: { kind: "Name", value: "message" } },
                            { kind: "Field", name: { kind: "Name", value: "actions" } },
                            { kind: "Field", name: { kind: "Name", value: "endpoint" } },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationObsidianRunWizardStepMutation,
  MutationObsidianRunWizardStepMutationVariables
>;
export const MutationObsidianReapplyBootstrapDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationObsidianReapplyBootstrap" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "obsidianReapplyBootstrap" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "overwritten" } },
                { kind: "Field", name: { kind: "Name", value: "skipped" } },
                { kind: "Field", name: { kind: "Name", value: "backedUpTo" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationObsidianReapplyBootstrapMutation,
  MutationObsidianReapplyBootstrapMutationVariables
>;
export const MutationObsidianReinstallPluginsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationObsidianReinstallPlugins" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "obsidianReinstallPlugins" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "reinstalled" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationObsidianReinstallPluginsMutation,
  MutationObsidianReinstallPluginsMutationVariables
>;
export const QueryProfilesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryProfiles" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "profiles" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "systemPrompt" } },
                { kind: "Field", name: { kind: "Name", value: "transcriptionPromptOverride" } },
                { kind: "Field", name: { kind: "Name", value: "outputTemplate" } },
                { kind: "Field", name: { kind: "Name", value: "cleanupLevel" } },
                { kind: "Field", name: { kind: "Name", value: "exportFolder" } },
                { kind: "Field", name: { kind: "Name", value: "autoTags" } },
                { kind: "Field", name: { kind: "Name", value: "isDefault" } },
                { kind: "Field", name: { kind: "Name", value: "isBuiltIn" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "glossaryByLanguage" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "language" } },
                      { kind: "Field", name: { kind: "Name", value: "terms" } },
                    ],
                  },
                },
                { kind: "Field", name: { kind: "Name", value: "llmCorrectionEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "llmProviderOverride" } },
                { kind: "Field", name: { kind: "Name", value: "llmModelOverride" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryProfilesQuery, QueryProfilesQueryVariables>;
export const MutationCreateProfileDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationCreateProfile" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "CreateProfileInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createProfile" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "profile" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "systemPrompt" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "transcriptionPromptOverride" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "outputTemplate" } },
                      { kind: "Field", name: { kind: "Name", value: "cleanupLevel" } },
                      { kind: "Field", name: { kind: "Name", value: "exportFolder" } },
                      { kind: "Field", name: { kind: "Name", value: "autoTags" } },
                      { kind: "Field", name: { kind: "Name", value: "isDefault" } },
                      { kind: "Field", name: { kind: "Name", value: "isBuiltIn" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "glossaryByLanguage" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "language" } },
                            { kind: "Field", name: { kind: "Name", value: "terms" } },
                          ],
                        },
                      },
                      { kind: "Field", name: { kind: "Name", value: "llmCorrectionEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "llmProviderOverride" } },
                      { kind: "Field", name: { kind: "Name", value: "llmModelOverride" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationCreateProfileMutation, MutationCreateProfileMutationVariables>;
export const MutationUpdateProfileDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationUpdateProfile" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "CreateProfileInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updateProfile" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "profile" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "systemPrompt" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "transcriptionPromptOverride" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "outputTemplate" } },
                      { kind: "Field", name: { kind: "Name", value: "cleanupLevel" } },
                      { kind: "Field", name: { kind: "Name", value: "exportFolder" } },
                      { kind: "Field", name: { kind: "Name", value: "autoTags" } },
                      { kind: "Field", name: { kind: "Name", value: "isDefault" } },
                      { kind: "Field", name: { kind: "Name", value: "isBuiltIn" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "glossaryByLanguage" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "language" } },
                            { kind: "Field", name: { kind: "Name", value: "terms" } },
                          ],
                        },
                      },
                      { kind: "Field", name: { kind: "Name", value: "llmCorrectionEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "llmProviderOverride" } },
                      { kind: "Field", name: { kind: "Name", value: "llmModelOverride" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationUpdateProfileMutation, MutationUpdateProfileMutationVariables>;
export const MutationDeleteProfileDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationDeleteProfile" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "deleteProfile" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "profile" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationDeleteProfileMutation, MutationDeleteProfileMutationVariables>;
export const MutationDuplicateProfileDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationDuplicateProfile" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "duplicateProfile" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "profile" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "systemPrompt" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "transcriptionPromptOverride" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "outputTemplate" } },
                      { kind: "Field", name: { kind: "Name", value: "cleanupLevel" } },
                      { kind: "Field", name: { kind: "Name", value: "exportFolder" } },
                      { kind: "Field", name: { kind: "Name", value: "autoTags" } },
                      { kind: "Field", name: { kind: "Name", value: "isDefault" } },
                      { kind: "Field", name: { kind: "Name", value: "isBuiltIn" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "glossaryByLanguage" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "language" } },
                            { kind: "Field", name: { kind: "Name", value: "terms" } },
                          ],
                        },
                      },
                      { kind: "Field", name: { kind: "Name", value: "llmCorrectionEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "llmProviderOverride" } },
                      { kind: "Field", name: { kind: "Name", value: "llmModelOverride" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationDuplicateProfileMutation,
  MutationDuplicateProfileMutationVariables
>;
export const SuggestGlossaryTermsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "SuggestGlossaryTerms" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "profileId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "language" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "suggestGlossaryTerms" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "profileId" },
                value: { kind: "Variable", name: { kind: "Name", value: "profileId" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "language" },
                value: { kind: "Variable", name: { kind: "Name", value: "language" } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<SuggestGlossaryTermsQuery, SuggestGlossaryTermsQueryVariables>;
export const QueryPromptTemplatesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryPromptTemplates" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "promptTemplates" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "body" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryPromptTemplatesQuery, QueryPromptTemplatesQueryVariables>;
export const QueryPromptTemplateDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryPromptTemplate" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "promptTemplate" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "body" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryPromptTemplateQuery, QueryPromptTemplateQueryVariables>;
export const QueryPreviewPromptDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryPreviewPrompt" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "templateBody" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "previewPrompt" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "templateBody" },
                value: { kind: "Variable", name: { kind: "Name", value: "templateBody" } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryPreviewPromptQuery, QueryPreviewPromptQueryVariables>;
export const MutationCreatePromptTemplateDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationCreatePromptTemplate" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "name" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "body" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "createPromptTemplate" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "name" },
                value: { kind: "Variable", name: { kind: "Name", value: "name" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "body" },
                value: { kind: "Variable", name: { kind: "Name", value: "body" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "body" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationCreatePromptTemplateMutation,
  MutationCreatePromptTemplateMutationVariables
>;
export const MutationUpdatePromptTemplateDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationUpdatePromptTemplate" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "name" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "body" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updatePromptTemplate" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "name" },
                value: { kind: "Variable", name: { kind: "Name", value: "name" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "body" },
                value: { kind: "Variable", name: { kind: "Name", value: "body" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "body" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationUpdatePromptTemplateMutation,
  MutationUpdatePromptTemplateMutationVariables
>;
export const MutationDeletePromptTemplateDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationDeletePromptTemplate" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "deletePromptTemplate" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationDeletePromptTemplateMutation,
  MutationDeletePromptTemplateMutationVariables
>;
export const MutationBuildPromptDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationBuildPrompt" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "template" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "buildPrompt" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "template" },
                value: { kind: "Variable", name: { kind: "Name", value: "template" } },
              },
            ],
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationBuildPromptMutation, MutationBuildPromptMutationVariables>;
export const QueryRagStatusDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryRagStatus" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "ragStatus" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "embeddedNotes" } },
                { kind: "Field", name: { kind: "Name", value: "chunks" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryRagStatusQuery, QueryRagStatusQueryVariables>;
export const QueryRagDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryRag" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "question" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "topK" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "ragQuery" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "question" },
                value: { kind: "Variable", name: { kind: "Name", value: "question" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "topK" },
                value: { kind: "Variable", name: { kind: "Name", value: "topK" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "answer" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "citations" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "noteId" } },
                      { kind: "Field", name: { kind: "Name", value: "segmentId" } },
                      { kind: "Field", name: { kind: "Name", value: "text" } },
                      { kind: "Field", name: { kind: "Name", value: "snippet" } },
                    ],
                  },
                },
                { kind: "Field", name: { kind: "Name", value: "llmAvailable" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryRagQuery, QueryRagQueryVariables>;
export const MutationRagReindexDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationRagReindex" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "ragReindex" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "embeddedNotes" } },
                { kind: "Field", name: { kind: "Name", value: "chunks" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationRagReindexMutation, MutationRagReindexMutationVariables>;
export const SubscriptionRecordingPartialsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "SubscriptionRecordingPartials" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "recordingId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "recordingPartials" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "recordingId" },
                value: { kind: "Variable", name: { kind: "Name", value: "recordingId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "recordingId" } },
                { kind: "Field", name: { kind: "Name", value: "sessionId" } },
                { kind: "Field", name: { kind: "Name", value: "text" } },
                { kind: "Field", name: { kind: "Name", value: "startSeconds" } },
                { kind: "Field", name: { kind: "Name", value: "endSeconds" } },
                { kind: "Field", name: { kind: "Name", value: "isFinal" } },
                { kind: "Field", name: { kind: "Name", value: "observedAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SubscriptionRecordingPartialsSubscription,
  SubscriptionRecordingPartialsSubscriptionVariables
>;
export const QueryRecordingsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryRecordings" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "first" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "after" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "last" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "before" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "recordings" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "first" },
                value: { kind: "Variable", name: { kind: "Name", value: "first" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "after" },
                value: { kind: "Variable", name: { kind: "Name", value: "after" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "last" },
                value: { kind: "Variable", name: { kind: "Name", value: "last" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "before" },
                value: { kind: "Variable", name: { kind: "Name", value: "before" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "totalCount" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "nodes" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "fileName" } },
                      { kind: "Field", name: { kind: "Name", value: "filePath" } },
                      { kind: "Field", name: { kind: "Name", value: "sha256" } },
                      { kind: "Field", name: { kind: "Name", value: "duration" } },
                      { kind: "Field", name: { kind: "Name", value: "format" } },
                      { kind: "Field", name: { kind: "Name", value: "sourceType" } },
                      { kind: "Field", name: { kind: "Name", value: "status" } },
                      { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pageInfo" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "hasNextPage" } },
                      { kind: "Field", name: { kind: "Name", value: "hasPreviousPage" } },
                      { kind: "Field", name: { kind: "Name", value: "startCursor" } },
                      { kind: "Field", name: { kind: "Name", value: "endCursor" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryRecordingsQuery, QueryRecordingsQueryVariables>;
export const QueryRecordingDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryRecording" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "recording" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "fileName" } },
                { kind: "Field", name: { kind: "Name", value: "filePath" } },
                { kind: "Field", name: { kind: "Name", value: "sha256" } },
                { kind: "Field", name: { kind: "Name", value: "duration" } },
                { kind: "Field", name: { kind: "Name", value: "format" } },
                { kind: "Field", name: { kind: "Name", value: "sourceType" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                { kind: "Field", name: { kind: "Name", value: "createdAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryRecordingQuery, QueryRecordingQueryVariables>;
export const MutationImportRecordingsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationImportRecordings" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "ImportRecordingsInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "importRecordings" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "recordings" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "fileName" } },
                      { kind: "Field", name: { kind: "Name", value: "status" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationImportRecordingsMutation,
  MutationImportRecordingsMutationVariables
>;
export const MutationUploadRecordingsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationUploadRecordings" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UploadRecordingsInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "uploadRecordings" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "recordings" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "fileName" } },
                      { kind: "Field", name: { kind: "Name", value: "status" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationUploadRecordingsMutation,
  MutationUploadRecordingsMutationVariables
>;
export const MutationDeleteRecordingDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationDeleteRecording" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "deleteRecording" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "recording" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationDeleteRecordingMutation,
  MutationDeleteRecordingMutationVariables
>;
export const QueryRecordingWithNotesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryRecordingWithNotes" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "id" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "recording" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "id" },
                value: { kind: "Variable", name: { kind: "Name", value: "id" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "fileName" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "notes" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "title" } },
                      { kind: "Field", name: { kind: "Name", value: "topic" } },
                      { kind: "Field", name: { kind: "Name", value: "summary" } },
                      { kind: "Field", name: { kind: "Name", value: "createdAt" } },
                      { kind: "Field", name: { kind: "Name", value: "transcriptId" } },
                      { kind: "Field", name: { kind: "Name", value: "profileId" } },
                      { kind: "Field", name: { kind: "Name", value: "version" } },
                      { kind: "Field", name: { kind: "Name", value: "source" } },
                      { kind: "Field", name: { kind: "Name", value: "markdownContent" } },
                      { kind: "Field", name: { kind: "Name", value: "exportedToVault" } },
                      { kind: "Field", name: { kind: "Name", value: "vaultPath" } },
                      { kind: "Field", name: { kind: "Name", value: "tags" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryRecordingWithNotesQuery, QueryRecordingWithNotesQueryVariables>;
export const MutationReprocessRecordingDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationReprocessRecording" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "recordingId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "profileId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UUID" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "reprocessRecording" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "recordingId" },
                value: { kind: "Variable", name: { kind: "Name", value: "recordingId" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "profileId" },
                value: { kind: "Variable", name: { kind: "Name", value: "profileId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "recording" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [{ kind: "Field", name: { kind: "Name", value: "id" } }],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationReprocessRecordingMutation,
  MutationReprocessRecordingMutationVariables
>;
export const MutationStartRecordingDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationStartRecording" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "outputPath" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "startRecording" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "outputPath" },
                value: { kind: "Variable", name: { kind: "Name", value: "outputPath" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "sessionId" } },
                { kind: "Field", name: { kind: "Name", value: "recordingId" } },
                { kind: "Field", name: { kind: "Name", value: "dictationSessionId" } },
                { kind: "Field", name: { kind: "Name", value: "outputPath" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationStartRecordingMutation,
  MutationStartRecordingMutationVariables
>;
export const MutationStopRecordingDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationStopRecording" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "sessionId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "stopRecording" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "sessionId" },
                value: { kind: "Variable", name: { kind: "Name", value: "sessionId" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "sessionId" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "recordings" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "fileName" } },
                      { kind: "Field", name: { kind: "Name", value: "status" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationStopRecordingMutation, MutationStopRecordingMutationVariables>;
export const QueryRoutinesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryRoutines" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "routines" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "key" } },
                { kind: "Field", name: { kind: "Name", value: "displayName" } },
                { kind: "Field", name: { kind: "Name", value: "description" } },
                { kind: "Field", name: { kind: "Name", value: "isEnabled" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "lastRun" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "routineKey" } },
                      { kind: "Field", name: { kind: "Name", value: "startedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "finishedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "status" } },
                      { kind: "Field", name: { kind: "Name", value: "errorMessage" } },
                      { kind: "Field", name: { kind: "Name", value: "payloadSummary" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryRoutinesQuery, QueryRoutinesQueryVariables>;
export const QueryRoutineRunsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryRoutineRuns" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "key" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "limit" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Int" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "routineRuns" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "key" },
                value: { kind: "Variable", name: { kind: "Name", value: "key" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "limit" },
                value: { kind: "Variable", name: { kind: "Name", value: "limit" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "routineKey" } },
                { kind: "Field", name: { kind: "Name", value: "startedAt" } },
                { kind: "Field", name: { kind: "Name", value: "finishedAt" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                { kind: "Field", name: { kind: "Name", value: "errorMessage" } },
                { kind: "Field", name: { kind: "Name", value: "payloadSummary" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryRoutineRunsQuery, QueryRoutineRunsQueryVariables>;
export const MutationToggleRoutineDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationToggleRoutine" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "key" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "enabled" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "Boolean" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "toggleRoutine" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "key" },
                value: { kind: "Variable", name: { kind: "Name", value: "key" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "enabled" },
                value: { kind: "Variable", name: { kind: "Name", value: "enabled" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "key" } },
                { kind: "Field", name: { kind: "Name", value: "displayName" } },
                { kind: "Field", name: { kind: "Name", value: "description" } },
                { kind: "Field", name: { kind: "Name", value: "isEnabled" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "lastRun" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "routineKey" } },
                      { kind: "Field", name: { kind: "Name", value: "startedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "finishedAt" } },
                      { kind: "Field", name: { kind: "Name", value: "status" } },
                      { kind: "Field", name: { kind: "Name", value: "errorMessage" } },
                      { kind: "Field", name: { kind: "Name", value: "payloadSummary" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationToggleRoutineMutation, MutationToggleRoutineMutationVariables>;
export const MutationRunRoutineNowDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationRunRoutineNow" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "key" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "runRoutineNow" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "key" },
                value: { kind: "Variable", name: { kind: "Name", value: "key" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "routineKey" } },
                { kind: "Field", name: { kind: "Name", value: "startedAt" } },
                { kind: "Field", name: { kind: "Name", value: "finishedAt" } },
                { kind: "Field", name: { kind: "Name", value: "status" } },
                { kind: "Field", name: { kind: "Name", value: "errorMessage" } },
                { kind: "Field", name: { kind: "Name", value: "payloadSummary" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<MutationRunRoutineNowMutation, MutationRunRoutineNowMutationVariables>;
export const QueryLlmCapabilitiesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryLlmCapabilities" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "llmCapabilities" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "supportsToolCalling" } },
                { kind: "Field", name: { kind: "Name", value: "supportsJsonMode" } },
                { kind: "Field", name: { kind: "Name", value: "ctxLength" } },
                { kind: "Field", name: { kind: "Name", value: "tokensPerSecond" } },
                { kind: "Field", name: { kind: "Name", value: "probedAt" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryLlmCapabilitiesQuery, QueryLlmCapabilitiesQueryVariables>;
export const QuerySettingsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QuerySettings" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "settings" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "vaultPath" } },
                { kind: "Field", name: { kind: "Name", value: "llmProvider" } },
                { kind: "Field", name: { kind: "Name", value: "llmEndpoint" } },
                { kind: "Field", name: { kind: "Name", value: "llmModel" } },
                { kind: "Field", name: { kind: "Name", value: "llmApiKey" } },
                { kind: "Field", name: { kind: "Name", value: "obsidianApiHost" } },
                { kind: "Field", name: { kind: "Name", value: "obsidianApiToken" } },
                { kind: "Field", name: { kind: "Name", value: "whisperModelPath" } },
                { kind: "Field", name: { kind: "Name", value: "vadModelPath" } },
                { kind: "Field", name: { kind: "Name", value: "language" } },
                { kind: "Field", name: { kind: "Name", value: "themeMode" } },
                { kind: "Field", name: { kind: "Name", value: "whisperThreads" } },
                { kind: "Field", name: { kind: "Name", value: "dictationEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "dictationHotkeyType" } },
                { kind: "Field", name: { kind: "Name", value: "dictationMouseButton" } },
                { kind: "Field", name: { kind: "Name", value: "dictationKeyboardHotkey" } },
                { kind: "Field", name: { kind: "Name", value: "dictationLanguage" } },
                { kind: "Field", name: { kind: "Name", value: "dictationWhisperModelId" } },
                { kind: "Field", name: { kind: "Name", value: "dictationCaptureSampleRate" } },
                { kind: "Field", name: { kind: "Name", value: "dictationLlmPolish" } },
                { kind: "Field", name: { kind: "Name", value: "dictationInjectMode" } },
                { kind: "Field", name: { kind: "Name", value: "dictationOverlayEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "dictationOverlayPosition" } },
                { kind: "Field", name: { kind: "Name", value: "dictationSoundFeedback" } },
                { kind: "Field", name: { kind: "Name", value: "dictationVocabulary" } },
                { kind: "Field", name: { kind: "Name", value: "dictationModelUnloadMinutes" } },
                { kind: "Field", name: { kind: "Name", value: "dictationTempAudioPath" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "dictationAppProfiles" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "key" } },
                      { kind: "Field", name: { kind: "Name", value: "value" } },
                    ],
                  },
                },
                { kind: "Field", name: { kind: "Name", value: "dictationPushToTalk" } },
                { kind: "Field", name: { kind: "Name", value: "syncthingEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "syncthingObsidianVaultPath" } },
                { kind: "Field", name: { kind: "Name", value: "syncthingApiKey" } },
                { kind: "Field", name: { kind: "Name", value: "syncthingBaseUrl" } },
                { kind: "Field", name: { kind: "Name", value: "obsidianFeatureEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "dictationDumpEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "dictationDumpHotkeyToggle" } },
                { kind: "Field", name: { kind: "Name", value: "dictationDumpHotkeyHold" } },
                { kind: "Field", name: { kind: "Name", value: "webCacheTtlHours" } },
                { kind: "Field", name: { kind: "Name", value: "mcpServerEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "mcpServerPort" } },
                { kind: "Field", name: { kind: "Name", value: "mcpServerToken" } },
                { kind: "Field", name: { kind: "Name", value: "actionsSkillEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "remindersSkillEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "dictationClassifyIntentEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "claudeCliPath" } },
                { kind: "Field", name: { kind: "Name", value: "sidecarEnrichmentEnabled" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QuerySettingsQuery, QuerySettingsQueryVariables>;
export const MutationUpdateSettingsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationUpdateSettings" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "UpdateSettingsInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updateSettings" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "settings" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "vaultPath" } },
                      { kind: "Field", name: { kind: "Name", value: "llmProvider" } },
                      { kind: "Field", name: { kind: "Name", value: "llmEndpoint" } },
                      { kind: "Field", name: { kind: "Name", value: "llmModel" } },
                      { kind: "Field", name: { kind: "Name", value: "llmApiKey" } },
                      { kind: "Field", name: { kind: "Name", value: "obsidianApiHost" } },
                      { kind: "Field", name: { kind: "Name", value: "obsidianApiToken" } },
                      { kind: "Field", name: { kind: "Name", value: "whisperModelPath" } },
                      { kind: "Field", name: { kind: "Name", value: "vadModelPath" } },
                      { kind: "Field", name: { kind: "Name", value: "language" } },
                      { kind: "Field", name: { kind: "Name", value: "themeMode" } },
                      { kind: "Field", name: { kind: "Name", value: "whisperThreads" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationHotkeyType" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationMouseButton" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationKeyboardHotkey" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationLanguage" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationWhisperModelId" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "dictationCaptureSampleRate" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "dictationLlmPolish" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationInjectMode" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationOverlayEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationOverlayPosition" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationSoundFeedback" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationVocabulary" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "dictationModelUnloadMinutes" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "dictationTempAudioPath" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "dictationAppProfiles" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "key" } },
                            { kind: "Field", name: { kind: "Name", value: "value" } },
                          ],
                        },
                      },
                      { kind: "Field", name: { kind: "Name", value: "dictationPushToTalk" } },
                      { kind: "Field", name: { kind: "Name", value: "syncthingEnabled" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "syncthingObsidianVaultPath" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "syncthingApiKey" } },
                      { kind: "Field", name: { kind: "Name", value: "syncthingBaseUrl" } },
                      { kind: "Field", name: { kind: "Name", value: "obsidianFeatureEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationDumpEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationDumpHotkeyToggle" } },
                      { kind: "Field", name: { kind: "Name", value: "dictationDumpHotkeyHold" } },
                      { kind: "Field", name: { kind: "Name", value: "webCacheTtlHours" } },
                      { kind: "Field", name: { kind: "Name", value: "mcpServerEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "mcpServerPort" } },
                      { kind: "Field", name: { kind: "Name", value: "mcpServerToken" } },
                      { kind: "Field", name: { kind: "Name", value: "actionsSkillEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "remindersSkillEnabled" } },
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "dictationClassifyIntentEnabled" },
                      },
                      { kind: "Field", name: { kind: "Name", value: "claudeCliPath" } },
                      { kind: "Field", name: { kind: "Name", value: "sidecarEnrichmentEnabled" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationUpdateSettingsMutation,
  MutationUpdateSettingsMutationVariables
>;
export const QuerySyncStatusDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QuerySyncStatus" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "syncStatus" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "folders" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "state" } },
                      { kind: "Field", name: { kind: "Name", value: "completionPct" } },
                      { kind: "Field", name: { kind: "Name", value: "conflicts" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "devices" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "id" } },
                      { kind: "Field", name: { kind: "Name", value: "name" } },
                      { kind: "Field", name: { kind: "Name", value: "connected" } },
                      { kind: "Field", name: { kind: "Name", value: "lastSeen" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QuerySyncStatusQuery, QuerySyncStatusQueryVariables>;
export const QuerySyncHealthDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QuerySyncHealth" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [{ kind: "Field", name: { kind: "Name", value: "syncHealth" } }],
      },
    },
  ],
} as unknown as DocumentNode<QuerySyncHealthQuery, QuerySyncHealthQueryVariables>;
export const QuerySyncPairingPayloadDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QuerySyncPairingPayload" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "syncPairingPayload" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "deviceId" } },
                { kind: "Field", name: { kind: "Name", value: "folderIds" } },
                { kind: "Field", name: { kind: "Name", value: "uri" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QuerySyncPairingPayloadQuery, QuerySyncPairingPayloadQueryVariables>;
export const MutationAcceptSyncDeviceDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationAcceptSyncDevice" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "deviceId" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
          },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "name" } },
          type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
        },
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "folderIds" } },
          type: {
            kind: "ListType",
            type: {
              kind: "NonNullType",
              type: { kind: "NamedType", name: { kind: "Name", value: "String" } },
            },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "acceptSyncDevice" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "deviceId" },
                value: { kind: "Variable", name: { kind: "Name", value: "deviceId" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "name" },
                value: { kind: "Variable", name: { kind: "Name", value: "name" } },
              },
              {
                kind: "Argument",
                name: { kind: "Name", value: "folderIds" },
                value: { kind: "Variable", name: { kind: "Name", value: "folderIds" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "accepted" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationAcceptSyncDeviceMutation,
  MutationAcceptSyncDeviceMutationVariables
>;
export const SubscriptionSyncEventsDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "subscription",
      name: { kind: "Name", value: "SubscriptionSyncEvents" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "syncEvents" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "id" } },
                { kind: "Field", name: { kind: "Name", value: "type" } },
                { kind: "Field", name: { kind: "Name", value: "time" } },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "folderCompletion" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "folder" } },
                      { kind: "Field", name: { kind: "Name", value: "device" } },
                      { kind: "Field", name: { kind: "Name", value: "completion" } },
                      { kind: "Field", name: { kind: "Name", value: "needBytes" } },
                      { kind: "Field", name: { kind: "Name", value: "globalBytes" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "deviceConnection" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "deviceId" } },
                      { kind: "Field", name: { kind: "Name", value: "connected" } },
                      { kind: "Field", name: { kind: "Name", value: "address" } },
                      { kind: "Field", name: { kind: "Name", value: "error" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "pendingDevices" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      {
                        kind: "Field",
                        name: { kind: "Name", value: "added" },
                        selectionSet: {
                          kind: "SelectionSet",
                          selections: [
                            { kind: "Field", name: { kind: "Name", value: "deviceId" } },
                            { kind: "Field", name: { kind: "Name", value: "name" } },
                            { kind: "Field", name: { kind: "Name", value: "address" } },
                          ],
                        },
                      },
                      { kind: "Field", name: { kind: "Name", value: "removed" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "fileConflict" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "folder" } },
                      { kind: "Field", name: { kind: "Name", value: "path" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  SubscriptionSyncEventsSubscription,
  SubscriptionSyncEventsSubscriptionVariables
>;
export const QuerySystemActionTemplatesDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QuerySystemActionTemplates" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "systemActionTemplates" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "name" } },
                { kind: "Field", name: { kind: "Name", value: "description" } },
                { kind: "Field", name: { kind: "Name", value: "deeplinkUrl" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  QuerySystemActionTemplatesQuery,
  QuerySystemActionTemplatesQueryVariables
>;
export const QueryWebSearchConfigDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryWebSearchConfig" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "webSearchConfig" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "ddgEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "yandexEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "googleEnabled" } },
                { kind: "Field", name: { kind: "Name", value: "cacheTtlHours" } },
                { kind: "Field", name: { kind: "Name", value: "rawSettingsYaml" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryWebSearchConfigQuery, QueryWebSearchConfigQueryVariables>;
export const MutationUpdateWebSearchConfigDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "mutation",
      name: { kind: "Name", value: "MutationUpdateWebSearchConfig" },
      variableDefinitions: [
        {
          kind: "VariableDefinition",
          variable: { kind: "Variable", name: { kind: "Name", value: "input" } },
          type: {
            kind: "NonNullType",
            type: { kind: "NamedType", name: { kind: "Name", value: "WebSearchConfigInput" } },
          },
        },
      ],
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "updateWebSearchConfig" },
            arguments: [
              {
                kind: "Argument",
                name: { kind: "Name", value: "input" },
                value: { kind: "Variable", name: { kind: "Name", value: "input" } },
              },
            ],
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                {
                  kind: "Field",
                  name: { kind: "Name", value: "config" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "ddgEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "yandexEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "googleEnabled" } },
                      { kind: "Field", name: { kind: "Name", value: "cacheTtlHours" } },
                      { kind: "Field", name: { kind: "Name", value: "rawSettingsYaml" } },
                    ],
                  },
                },
                {
                  kind: "Field",
                  name: { kind: "Name", value: "errors" },
                  selectionSet: {
                    kind: "SelectionSet",
                    selections: [
                      { kind: "Field", name: { kind: "Name", value: "code" } },
                      { kind: "Field", name: { kind: "Name", value: "message" } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<
  MutationUpdateWebSearchConfigMutation,
  MutationUpdateWebSearchConfigMutationVariables
>;
