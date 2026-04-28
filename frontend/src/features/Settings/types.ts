import type { LlmCapabilities } from "../../api/gql/graphql";
import type { AppSettings } from "../../domain/Settings";

export interface SettingsStateProps {
  readonly settings: AppSettings | null;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly isLlmProbing: boolean;
  readonly llmCapabilities: LlmCapabilities | null;
}

export interface SettingsDispatchProps {
  readonly onLoad: () => void;
  readonly onSave: (settings: AppSettings) => void;
  readonly onCheckLlm: () => void;
  readonly onLoadCapabilities: () => void;
}

export type SettingsProps = SettingsStateProps & SettingsDispatchProps;
