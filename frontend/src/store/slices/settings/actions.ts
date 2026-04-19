import type {AppSettings} from "../../../domain/Settings";

export const LOAD_SETTINGS = "settings/LOAD";
export const LOAD_SETTINGS_SUCCESS = "settings/LOAD_SUCCESS";
export const LOAD_SETTINGS_FAILURE = "settings/LOAD_FAILURE";

export const SAVE_SETTINGS = "settings/SAVE";
export const SAVE_SETTINGS_SUCCESS = "settings/SAVE_SUCCESS";
export const SAVE_SETTINGS_FAILURE = "settings/SAVE_FAILURE";

export const CHECK_LLM = "settings/CHECK_LLM";
export const CHECK_LLM_RESULT = "settings/CHECK_LLM_RESULT";

export interface LoadSettingsAction {
    type: typeof LOAD_SETTINGS;
}

export interface LoadSettingsSuccessAction {
    type: typeof LOAD_SETTINGS_SUCCESS;
    payload: AppSettings;
}

export interface LoadSettingsFailureAction {
    type: typeof LOAD_SETTINGS_FAILURE;
    payload: string;
}

export interface SaveSettingsAction {
    type: typeof SAVE_SETTINGS;
    payload: AppSettings;
}

export interface SaveSettingsSuccessAction {
    type: typeof SAVE_SETTINGS_SUCCESS;
    payload: AppSettings;
}

export interface SaveSettingsFailureAction {
    type: typeof SAVE_SETTINGS_FAILURE;
    payload: string;
}

export interface CheckLlmAction {
    type: typeof CHECK_LLM;
}

export interface CheckLlmResultAction {
    type: typeof CHECK_LLM_RESULT;
    payload: { ok: boolean };
}

export type SettingsAction =
    | LoadSettingsAction
    | LoadSettingsSuccessAction
    | LoadSettingsFailureAction
    | SaveSettingsAction
    | SaveSettingsSuccessAction
    | SaveSettingsFailureAction
    | CheckLlmAction
    | CheckLlmResultAction;

export const loadSettings = (): LoadSettingsAction => ({type: LOAD_SETTINGS});
export const loadSettingsSuccess = (settings: AppSettings): LoadSettingsSuccessAction => ({
    type: LOAD_SETTINGS_SUCCESS,
    payload: settings,
});
export const loadSettingsFailure = (message: string): LoadSettingsFailureAction => ({
    type: LOAD_SETTINGS_FAILURE,
    payload: message,
});

export const saveSettings = (settings: AppSettings): SaveSettingsAction => ({
    type: SAVE_SETTINGS,
    payload: settings,
});
export const saveSettingsSuccess = (settings: AppSettings): SaveSettingsSuccessAction => ({
    type: SAVE_SETTINGS_SUCCESS,
    payload: settings,
});
export const saveSettingsFailure = (message: string): SaveSettingsFailureAction => ({
    type: SAVE_SETTINGS_FAILURE,
    payload: message,
});

export const checkLlm = (): CheckLlmAction => ({type: CHECK_LLM});
export const checkLlmResult = (ok: boolean): CheckLlmResultAction => ({
    type: CHECK_LLM_RESULT,
    payload: {ok},
});
