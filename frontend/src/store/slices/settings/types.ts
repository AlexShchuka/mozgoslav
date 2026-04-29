import type { LlmCapabilities, LlmModelDescriptor } from "../../../api/gql/graphql";
import type { AppSettings } from "../../../domain/Settings";

export type { LlmCapabilities, LlmModelDescriptor };

export interface LlmModelsState {
  readonly loading: boolean;
  readonly available: readonly LlmModelDescriptor[];
  readonly error: boolean;
}

export interface SettingsState {
  readonly settings: AppSettings | null;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly llmProbe: { probing: boolean };
  readonly llmCapabilities: LlmCapabilities | null;
  readonly llmModels: LlmModelsState;
}

export const initialSettingsState: SettingsState = {
  settings: null,
  isLoading: false,
  isSaving: false,
  llmProbe: { probing: false },
  llmCapabilities: null,
  llmModels: { loading: false, available: [], error: false },
};
