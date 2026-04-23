import type { AppSettings } from "../../../domain/Settings";

export const LOAD_SETTINGS = "settings/LOAD";
export const LOAD_SETTINGS_SUCCESS = "settings/LOAD_SUCCESS";
export const LOAD_SETTINGS_FAILURE = "settings/LOAD_FAILURE";

export const SAVE_SETTINGS = "settings/SAVE";
export const SAVE_SETTINGS_SUCCESS = "settings/SAVE_SUCCESS";
export const SAVE_SETTINGS_FAILURE = "settings/SAVE_FAILURE";

export const CHECK_LLM = "settings/CHECK_LLM";
export const CHECK_LLM_DONE = "settings/CHECK_LLM_DONE";

export interface LoadSettingsAction {
  type: typeof LOAD_SETTINGS;
}

export interface LoadSettingsSuccessAction {
  type: typeof LOAD_SETTINGS_SUCCESS;
  payload: AppSettings;
}

export interface LoadSettingsFailureAction {
  type: typeof LOAD_SETTINGS_FAILURE;
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
}

export interface CheckLlmAction {
  type: typeof CHECK_LLM;
}

export interface CheckLlmDoneAction {
  type: typeof CHECK_LLM_DONE;
}

export type SettingsAction =
  | LoadSettingsAction
  | LoadSettingsSuccessAction
  | LoadSettingsFailureAction
  | SaveSettingsAction
  | SaveSettingsSuccessAction
  | SaveSettingsFailureAction
  | CheckLlmAction
  | CheckLlmDoneAction;

export const loadSettings = (): LoadSettingsAction => ({ type: LOAD_SETTINGS });
export const loadSettingsSuccess = (settings: AppSettings): LoadSettingsSuccessAction => ({
  type: LOAD_SETTINGS_SUCCESS,
  payload: settings,
});
export const loadSettingsFailure = (): LoadSettingsFailureAction => ({
  type: LOAD_SETTINGS_FAILURE,
});

export const saveSettings = (settings: AppSettings): SaveSettingsAction => ({
  type: SAVE_SETTINGS,
  payload: settings,
});
export const saveSettingsSuccess = (settings: AppSettings): SaveSettingsSuccessAction => ({
  type: SAVE_SETTINGS_SUCCESS,
  payload: settings,
});
export const saveSettingsFailure = (): SaveSettingsFailureAction => ({
  type: SAVE_SETTINGS_FAILURE,
});

export const checkLlm = (): CheckLlmAction => ({ type: CHECK_LLM });
export const checkLlmDone = (): CheckLlmDoneAction => ({ type: CHECK_LLM_DONE });
