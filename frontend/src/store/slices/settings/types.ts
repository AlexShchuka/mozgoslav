import type {AppSettings} from "../../../domain/Settings";

export interface SettingsState {
    readonly settings: AppSettings | null;
    readonly isLoading: boolean;
    readonly isSaving: boolean;
    readonly error: string | null;
    readonly llmProbe: { ok: boolean | null; probing: boolean };
}

export const initialSettingsState: SettingsState = {
    settings: null,
    isLoading: false,
    isSaving: false,
    error: null,
    llmProbe: {ok: null, probing: false},
};
