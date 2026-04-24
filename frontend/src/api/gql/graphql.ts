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
  dictationAppProfiles: Array<KeyValuePairOfStringAndString>;
  dictationCaptureSampleRate: Scalars["Int"]["output"];
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
  obsidianApiHost: Scalars["String"]["output"];
  obsidianApiToken: Scalars["String"]["output"];
  obsidianFeatureEnabled: Scalars["Boolean"]["output"];
  syncthingApiKey: Scalars["String"]["output"];
  syncthingBaseUrl: Scalars["String"]["output"];
  syncthingEnabled: Scalars["Boolean"]["output"];
  syncthingObsidianVaultPath: Scalars["String"]["output"];
  themeMode: Scalars["String"]["output"];
  vadModelPath: Scalars["String"]["output"];
  vaultPath: Scalars["String"]["output"];
  whisperModelPath: Scalars["String"]["output"];
  whisperThreads: Scalars["Int"]["output"];
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

export type BooleanOperationFilterInput = {
  eq?: InputMaybe<Scalars["Boolean"]["input"]>;
  neq?: InputMaybe<Scalars["Boolean"]["input"]>;
};

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

export type CreateProfileInput = {
  autoTags: Array<Scalars["String"]["input"]>;
  cleanupLevel: CleanupLevel;
  exportFolder: Scalars["String"]["input"];
  glossary: Array<Scalars["String"]["input"]>;
  isDefault: Scalars["Boolean"]["input"];
  llmCorrectionEnabled: Scalars["Boolean"]["input"];
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

export type DownloadModelPayload = {
  __typename?: "DownloadModelPayload";
  downloadId?: Maybe<Scalars["String"]["output"]>;
  errors: Array<IUserError>;
};

export type HealthStatus = {
  __typename?: "HealthStatus";
  status: Scalars["String"]["output"];
  time: Scalars["String"]["output"];
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

export type LlmHealthStatus = {
  __typename?: "LlmHealthStatus";
  available: Scalars["Boolean"]["output"];
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
  createProfile: ProfilePayload;
  deleteProfile: ProfilePayload;
  downloadModel: DownloadModelPayload;
  duplicateProfile: ProfilePayload;
  exportNote: NotePayload;
  importRecordings: ImportRecordingsPayload;
  reprocessRecording: RecordingPayload;
  startRecording: StartRecordingPayload;
  stopRecording: StopRecordingPayload;
  updateProfile: ProfilePayload;
  updateSettings: UpdateSettingsPayload;
  uploadRecordings: ImportRecordingsPayload;
};

export type MutationTypeCreateProfileArgs = {
  input: CreateProfileInput;
};

export type MutationTypeDeleteProfileArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeDownloadModelArgs = {
  catalogueId: Scalars["String"]["input"];
};

export type MutationTypeDuplicateProfileArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeExportNoteArgs = {
  id: Scalars["UUID"]["input"];
};

export type MutationTypeImportRecordingsArgs = {
  input: ImportRecordingsInput;
};

export type MutationTypeReprocessRecordingArgs = {
  profileId: Scalars["UUID"]["input"];
  recordingId: Scalars["UUID"]["input"];
};

export type MutationTypeStartRecordingArgs = {
  outputPath?: InputMaybe<Scalars["String"]["input"]>;
};

export type MutationTypeStopRecordingArgs = {
  sessionId: Scalars["String"]["input"];
};

export type MutationTypeUpdateProfileArgs = {
  id: Scalars["UUID"]["input"];
  input: CreateProfileInput;
};

export type MutationTypeUpdateSettingsArgs = {
  input: UpdateSettingsInput;
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

export type Profile = Node & {
  __typename?: "Profile";
  autoTags: Array<Scalars["String"]["output"]>;
  cleanupLevel: CleanupLevel;
  exportFolder: Scalars["String"]["output"];
  glossary: Array<Scalars["String"]["output"]>;
  id: Scalars["ID"]["output"];
  isBuiltIn: Scalars["Boolean"]["output"];
  isDefault: Scalars["Boolean"]["output"];
  llmCorrectionEnabled: Scalars["Boolean"]["output"];
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

export type QueryType = {
  __typename?: "QueryType";
  health: HealthStatus;
  llmHealth: LlmHealthStatus;
  meta: MetaInfo;
  models: Array<ModelEntry>;
  /** Fetches an object given its ID. */
  node?: Maybe<Node>;
  /** Lookup nodes by a list of IDs. */
  nodes: Array<Maybe<Node>>;
  note?: Maybe<ProcessedNote>;
  notes?: Maybe<NotesConnection>;
  profile?: Maybe<Profile>;
  profiles: Array<Profile>;
  recording?: Maybe<Recording>;
  recordings?: Maybe<RecordingsConnection>;
  settings: AppSettingsDto;
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

export type QueryTypeProfileArgs = {
  id: Scalars["UUID"]["input"];
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

export type Recording = Node & {
  __typename?: "Recording";
  createdAt: Scalars["DateTime"]["output"];
  duration: Scalars["TimeSpan"]["output"];
  fileName: Scalars["String"]["output"];
  filePath: Scalars["String"]["output"];
  format: AudioFormat;
  id: Scalars["ID"]["output"];
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
  errors: Array<IUserError>;
  outputPath?: Maybe<Scalars["String"]["output"]>;
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
  modelDownloadProgress: ModelDownloadProgressEvent;
};

export type SubscriptionTypeModelDownloadProgressArgs = {
  downloadId: Scalars["String"]["input"];
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

export type UpdateSettingsInput = {
  dictationAppProfiles: Array<KeyValuePairOfStringAndStringInput>;
  dictationCaptureSampleRate: Scalars["Int"]["input"];
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
  obsidianApiHost: Scalars["String"]["input"];
  obsidianApiToken: Scalars["String"]["input"];
  obsidianFeatureEnabled?: Scalars["Boolean"]["input"];
  syncthingApiKey: Scalars["String"]["input"];
  syncthingBaseUrl: Scalars["String"]["input"];
  syncthingEnabled: Scalars["Boolean"]["input"];
  syncthingObsidianVaultPath: Scalars["String"]["input"];
  themeMode: Scalars["String"]["input"];
  vadModelPath: Scalars["String"]["input"];
  vaultPath: Scalars["String"]["input"];
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
    glossary: Array<string>;
    llmCorrectionEnabled: boolean;
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
      glossary: Array<string>;
      llmCorrectionEnabled: boolean;
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
      glossary: Array<string>;
      llmCorrectionEnabled: boolean;
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
      glossary: Array<string>;
      llmCorrectionEnabled: boolean;
    } | null;
    errors: Array<
      | { __typename?: "ConflictError"; code: string; message: string }
      | { __typename?: "NotFoundError"; code: string; message: string }
      | { __typename?: "UnavailableError"; code: string; message: string }
      | { __typename?: "ValidationError"; code: string; message: string }
    >;
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
                { kind: "Field", name: { kind: "Name", value: "glossary" } },
                { kind: "Field", name: { kind: "Name", value: "llmCorrectionEnabled" } },
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
                      { kind: "Field", name: { kind: "Name", value: "glossary" } },
                      { kind: "Field", name: { kind: "Name", value: "llmCorrectionEnabled" } },
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
                      { kind: "Field", name: { kind: "Name", value: "glossary" } },
                      { kind: "Field", name: { kind: "Name", value: "llmCorrectionEnabled" } },
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
                      { kind: "Field", name: { kind: "Name", value: "glossary" } },
                      { kind: "Field", name: { kind: "Name", value: "llmCorrectionEnabled" } },
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
