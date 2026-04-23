import type { AppSettings } from "../../domain/Settings";

export interface SettingsStateProps {
  readonly settings: AppSettings | null;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly isLlmProbing: boolean;
}

export interface SettingsDispatchProps {
  readonly onLoad: () => void;
  readonly onSave: (settings: AppSettings) => void;
  readonly onCheckLlm: () => void;
}

export type SettingsProps = SettingsStateProps & SettingsDispatchProps;
