import type { LlmCapabilities } from "../../../api/gql/graphql";
import type { AppSettings } from "../../../domain/Settings";

export type { LlmCapabilities };

export interface SettingsState {
  readonly settings: AppSettings | null;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly llmProbe: { probing: boolean };
  readonly llmCapabilities: LlmCapabilities | null;
}

export const initialSettingsState: SettingsState = {
  settings: null,
  isLoading: false,
  isSaving: false,
  llmProbe: { probing: false },
  llmCapabilities: null,
};
