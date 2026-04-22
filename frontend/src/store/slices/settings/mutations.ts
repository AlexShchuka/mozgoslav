import type {AppSettings} from "../../../domain/Settings";
import type {SettingsState} from "./types";

export const markLlmProbing = (state: SettingsState): SettingsState => ({
    ...state,
    llmProbe: {probing: true},
});

export const settleLlmProbing = (state: SettingsState): SettingsState => ({
    ...state,
    llmProbe: {probing: false},
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
