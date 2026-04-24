/* eslint-disable */
import * as types from "./graphql";
import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
  "query QueryHealth {\n  health {\n    status\n    time\n  }\n}\n\nquery QueryLlmHealth {\n  llmHealth {\n    available\n  }\n}\n\nquery QueryMeta {\n  meta {\n    version\n    assemblyVersion\n    commit\n    buildDate\n  }\n}": typeof types.QueryHealthDocument;
  "query QuerySettings {\n  settings {\n    vaultPath\n    llmProvider\n    llmEndpoint\n    llmModel\n    llmApiKey\n    obsidianApiHost\n    obsidianApiToken\n    whisperModelPath\n    vadModelPath\n    language\n    themeMode\n    whisperThreads\n    dictationEnabled\n    dictationHotkeyType\n    dictationMouseButton\n    dictationKeyboardHotkey\n    dictationLanguage\n    dictationWhisperModelId\n    dictationCaptureSampleRate\n    dictationLlmPolish\n    dictationInjectMode\n    dictationOverlayEnabled\n    dictationOverlayPosition\n    dictationSoundFeedback\n    dictationVocabulary\n    dictationModelUnloadMinutes\n    dictationTempAudioPath\n    dictationAppProfiles {\n      key\n      value\n    }\n    dictationPushToTalk\n    syncthingEnabled\n    syncthingObsidianVaultPath\n    syncthingApiKey\n    syncthingBaseUrl\n    obsidianFeatureEnabled\n  }\n}\n\nmutation MutationUpdateSettings($input: UpdateSettingsInput!) {\n  updateSettings(input: $input) {\n    settings {\n      vaultPath\n      llmProvider\n      llmEndpoint\n      llmModel\n      llmApiKey\n      obsidianApiHost\n      obsidianApiToken\n      whisperModelPath\n      vadModelPath\n      language\n      themeMode\n      whisperThreads\n      dictationEnabled\n      dictationHotkeyType\n      dictationMouseButton\n      dictationKeyboardHotkey\n      dictationLanguage\n      dictationWhisperModelId\n      dictationCaptureSampleRate\n      dictationLlmPolish\n      dictationInjectMode\n      dictationOverlayEnabled\n      dictationOverlayPosition\n      dictationSoundFeedback\n      dictationVocabulary\n      dictationModelUnloadMinutes\n      dictationTempAudioPath\n      dictationAppProfiles {\n        key\n        value\n      }\n      dictationPushToTalk\n      syncthingEnabled\n      syncthingObsidianVaultPath\n      syncthingApiKey\n      syncthingBaseUrl\n      obsidianFeatureEnabled\n    }\n    errors {\n      code\n      message\n    }\n  }\n}": typeof types.QuerySettingsDocument;
};
const documents: Documents = {
  "query QueryHealth {\n  health {\n    status\n    time\n  }\n}\n\nquery QueryLlmHealth {\n  llmHealth {\n    available\n  }\n}\n\nquery QueryMeta {\n  meta {\n    version\n    assemblyVersion\n    commit\n    buildDate\n  }\n}":
    types.QueryHealthDocument,
  "query QuerySettings {\n  settings {\n    vaultPath\n    llmProvider\n    llmEndpoint\n    llmModel\n    llmApiKey\n    obsidianApiHost\n    obsidianApiToken\n    whisperModelPath\n    vadModelPath\n    language\n    themeMode\n    whisperThreads\n    dictationEnabled\n    dictationHotkeyType\n    dictationMouseButton\n    dictationKeyboardHotkey\n    dictationLanguage\n    dictationWhisperModelId\n    dictationCaptureSampleRate\n    dictationLlmPolish\n    dictationInjectMode\n    dictationOverlayEnabled\n    dictationOverlayPosition\n    dictationSoundFeedback\n    dictationVocabulary\n    dictationModelUnloadMinutes\n    dictationTempAudioPath\n    dictationAppProfiles {\n      key\n      value\n    }\n    dictationPushToTalk\n    syncthingEnabled\n    syncthingObsidianVaultPath\n    syncthingApiKey\n    syncthingBaseUrl\n    obsidianFeatureEnabled\n  }\n}\n\nmutation MutationUpdateSettings($input: UpdateSettingsInput!) {\n  updateSettings(input: $input) {\n    settings {\n      vaultPath\n      llmProvider\n      llmEndpoint\n      llmModel\n      llmApiKey\n      obsidianApiHost\n      obsidianApiToken\n      whisperModelPath\n      vadModelPath\n      language\n      themeMode\n      whisperThreads\n      dictationEnabled\n      dictationHotkeyType\n      dictationMouseButton\n      dictationKeyboardHotkey\n      dictationLanguage\n      dictationWhisperModelId\n      dictationCaptureSampleRate\n      dictationLlmPolish\n      dictationInjectMode\n      dictationOverlayEnabled\n      dictationOverlayPosition\n      dictationSoundFeedback\n      dictationVocabulary\n      dictationModelUnloadMinutes\n      dictationTempAudioPath\n      dictationAppProfiles {\n        key\n        value\n      }\n      dictationPushToTalk\n      syncthingEnabled\n      syncthingObsidianVaultPath\n      syncthingApiKey\n      syncthingBaseUrl\n      obsidianFeatureEnabled\n    }\n    errors {\n      code\n      message\n    }\n  }\n}":
    types.QuerySettingsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query QueryHealth {\n  health {\n    status\n    time\n  }\n}\n\nquery QueryLlmHealth {\n  llmHealth {\n    available\n  }\n}\n\nquery QueryMeta {\n  meta {\n    version\n    assemblyVersion\n    commit\n    buildDate\n  }\n}"
): (typeof documents)["query QueryHealth {\n  health {\n    status\n    time\n  }\n}\n\nquery QueryLlmHealth {\n  llmHealth {\n    available\n  }\n}\n\nquery QueryMeta {\n  meta {\n    version\n    assemblyVersion\n    commit\n    buildDate\n  }\n}"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(
  source: "query QuerySettings {\n  settings {\n    vaultPath\n    llmProvider\n    llmEndpoint\n    llmModel\n    llmApiKey\n    obsidianApiHost\n    obsidianApiToken\n    whisperModelPath\n    vadModelPath\n    language\n    themeMode\n    whisperThreads\n    dictationEnabled\n    dictationHotkeyType\n    dictationMouseButton\n    dictationKeyboardHotkey\n    dictationLanguage\n    dictationWhisperModelId\n    dictationCaptureSampleRate\n    dictationLlmPolish\n    dictationInjectMode\n    dictationOverlayEnabled\n    dictationOverlayPosition\n    dictationSoundFeedback\n    dictationVocabulary\n    dictationModelUnloadMinutes\n    dictationTempAudioPath\n    dictationAppProfiles {\n      key\n      value\n    }\n    dictationPushToTalk\n    syncthingEnabled\n    syncthingObsidianVaultPath\n    syncthingApiKey\n    syncthingBaseUrl\n    obsidianFeatureEnabled\n  }\n}\n\nmutation MutationUpdateSettings($input: UpdateSettingsInput!) {\n  updateSettings(input: $input) {\n    settings {\n      vaultPath\n      llmProvider\n      llmEndpoint\n      llmModel\n      llmApiKey\n      obsidianApiHost\n      obsidianApiToken\n      whisperModelPath\n      vadModelPath\n      language\n      themeMode\n      whisperThreads\n      dictationEnabled\n      dictationHotkeyType\n      dictationMouseButton\n      dictationKeyboardHotkey\n      dictationLanguage\n      dictationWhisperModelId\n      dictationCaptureSampleRate\n      dictationLlmPolish\n      dictationInjectMode\n      dictationOverlayEnabled\n      dictationOverlayPosition\n      dictationSoundFeedback\n      dictationVocabulary\n      dictationModelUnloadMinutes\n      dictationTempAudioPath\n      dictationAppProfiles {\n        key\n        value\n      }\n      dictationPushToTalk\n      syncthingEnabled\n      syncthingObsidianVaultPath\n      syncthingApiKey\n      syncthingBaseUrl\n      obsidianFeatureEnabled\n    }\n    errors {\n      code\n      message\n    }\n  }\n}"
): (typeof documents)["query QuerySettings {\n  settings {\n    vaultPath\n    llmProvider\n    llmEndpoint\n    llmModel\n    llmApiKey\n    obsidianApiHost\n    obsidianApiToken\n    whisperModelPath\n    vadModelPath\n    language\n    themeMode\n    whisperThreads\n    dictationEnabled\n    dictationHotkeyType\n    dictationMouseButton\n    dictationKeyboardHotkey\n    dictationLanguage\n    dictationWhisperModelId\n    dictationCaptureSampleRate\n    dictationLlmPolish\n    dictationInjectMode\n    dictationOverlayEnabled\n    dictationOverlayPosition\n    dictationSoundFeedback\n    dictationVocabulary\n    dictationModelUnloadMinutes\n    dictationTempAudioPath\n    dictationAppProfiles {\n      key\n      value\n    }\n    dictationPushToTalk\n    syncthingEnabled\n    syncthingObsidianVaultPath\n    syncthingApiKey\n    syncthingBaseUrl\n    obsidianFeatureEnabled\n  }\n}\n\nmutation MutationUpdateSettings($input: UpdateSettingsInput!) {\n  updateSettings(input: $input) {\n    settings {\n      vaultPath\n      llmProvider\n      llmEndpoint\n      llmModel\n      llmApiKey\n      obsidianApiHost\n      obsidianApiToken\n      whisperModelPath\n      vadModelPath\n      language\n      themeMode\n      whisperThreads\n      dictationEnabled\n      dictationHotkeyType\n      dictationMouseButton\n      dictationKeyboardHotkey\n      dictationLanguage\n      dictationWhisperModelId\n      dictationCaptureSampleRate\n      dictationLlmPolish\n      dictationInjectMode\n      dictationOverlayEnabled\n      dictationOverlayPosition\n      dictationSoundFeedback\n      dictationVocabulary\n      dictationModelUnloadMinutes\n      dictationTempAudioPath\n      dictationAppProfiles {\n        key\n        value\n      }\n      dictationPushToTalk\n      syncthingEnabled\n      syncthingObsidianVaultPath\n      syncthingApiKey\n      syncthingBaseUrl\n      obsidianFeatureEnabled\n    }\n    errors {\n      code\n      message\n    }\n  }\n}"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> =
  TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
