import type { AppSettings } from "../../domain/Settings";

export interface SettingsStateProps {
  readonly settings: AppSettings | null;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly llmProbe: { ok: boolean | null; probing: boolean };
  readonly error: string | null;
}

export interface SettingsDispatchProps {
  readonly onLoad: () => void;
  readonly onSave: (settings: AppSettings) => void;
  readonly onCheckLlm: () => void;
}

export type SettingsProps = SettingsStateProps & SettingsDispatchProps;
