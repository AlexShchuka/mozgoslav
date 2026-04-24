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
  /** The `Long` scalar type represents non-fractional signed whole 64-bit numeric values. Long can represent values between -(2^63) and 2^63 - 1. */
  Long: { input: any; output: any };
  UUID: { input: string; output: string };
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

export type KeyValuePairOfStringAndString = {
  __typename?: "KeyValuePairOfStringAndString";
  key: Scalars["String"]["output"];
  value: Scalars["String"]["output"];
};

export type KeyValuePairOfStringAndStringInput = {
  key: Scalars["String"]["input"];
  value: Scalars["String"]["input"];
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
  updateProfile: ProfilePayload;
  updateSettings: UpdateSettingsPayload;
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

export type MutationTypeUpdateProfileArgs = {
  id: Scalars["UUID"]["input"];
  input: CreateProfileInput;
};

export type MutationTypeUpdateSettingsArgs = {
  input: UpdateSettingsInput;
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
  profile?: Maybe<Profile>;
  profiles: Array<Profile>;
  settings: AppSettingsDto;
};

export type QueryTypeNodeArgs = {
  id: Scalars["ID"]["input"];
};

export type QueryTypeNodesArgs = {
  ids: Array<Scalars["ID"]["input"]>;
};

export type QueryTypeProfileArgs = {
  id: Scalars["UUID"]["input"];
};

export type SubscriptionType = {
  __typename?: "SubscriptionType";
  modelDownloadProgress: ModelDownloadProgressEvent;
};

export type SubscriptionTypeModelDownloadProgressArgs = {
  downloadId: Scalars["String"]["input"];
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
