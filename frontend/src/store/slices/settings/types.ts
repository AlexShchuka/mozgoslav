import type {AppSettings} from "../../../domain/Settings";

export interface SettingsState {
    readonly settings: AppSettings | null;
    readonly isLoading: boolean;
    readonly isSaving: boolean;
    readonly llmProbe: { probing: boolean };
}

export const initialSettingsState: SettingsState = {
    settings: null,
    isLoading: false,
    isSaving: false,
    llmProbe: {probing: false},
};
