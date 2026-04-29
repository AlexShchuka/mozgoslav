import type { LlmCapabilities, LlmModelDescriptor } from "../../api/gql/graphql";
import type { AppSettings } from "../../domain/Settings";

export interface SettingsStateProps {
  readonly settings: AppSettings | null;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly isLlmProbing: boolean;
  readonly llmCapabilities: LlmCapabilities | null;
  readonly llmModels: readonly LlmModelDescriptor[];
  readonly llmModelsLoading: boolean;
  readonly llmModelsError: boolean;
}

export interface SettingsDispatchProps {
  readonly onLoad: () => void;
  readonly onSave: (settings: AppSettings) => void;
  readonly onCheckLlm: () => void;
  readonly onLoadCapabilities: () => void;
  readonly onLoadModels: () => void;
}

export type SettingsProps = SettingsStateProps & SettingsDispatchProps;
