import type { LlmCapabilities, LlmModelDescriptor } from "../../../api/gql/graphql";
import type { AppSettings } from "../../../domain/Settings";
import type { SettingsState } from "./types";

export const markLlmProbing = (state: SettingsState): SettingsState => ({
  ...state,
  llmProbe: { probing: true },
});

export const settleLlmProbing = (state: SettingsState): SettingsState => ({
  ...state,
  llmProbe: { probing: false },
});

export const applyLoaded = (state: SettingsState, settings: AppSettings): SettingsState => ({
  ...state,
  settings,
  isLoading: false,
});

export const applySaved = (state: SettingsState, settings: AppSettings): SettingsState => ({
  ...state,
  settings,
  isSaving: false,
});

export const applyLlmCapabilities = (
  state: SettingsState,
  capabilities: LlmCapabilities | null
): SettingsState => ({
  ...state,
  llmCapabilities: capabilities,
});

export const markLlmModelsLoading = (state: SettingsState): SettingsState => ({
  ...state,
  llmModels: { ...state.llmModels, loading: true, error: false },
});

export const applyLlmModelsLoaded = (
  state: SettingsState,
  models: readonly LlmModelDescriptor[]
): SettingsState => ({
  ...state,
  llmModels: { loading: false, available: models, error: false },
});

export const markLlmModelsFailed = (state: SettingsState): SettingsState => ({
  ...state,
  llmModels: { loading: false, available: [], error: true },
});
