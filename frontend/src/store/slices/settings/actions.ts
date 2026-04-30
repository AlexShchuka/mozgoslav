import type { LlmCapabilities, LlmModelDescriptor } from "../../../api/gql/graphql";
import type { AppSettings } from "../../../domain/Settings";

export const LOAD_SETTINGS = "settings/LOAD";
export const LOAD_SETTINGS_SUCCESS = "settings/LOAD_SUCCESS";
export const LOAD_SETTINGS_FAILURE = "settings/LOAD_FAILURE";

export const SAVE_SETTINGS = "settings/SAVE";
export const SAVE_SETTINGS_SUCCESS = "settings/SAVE_SUCCESS";
export const SAVE_SETTINGS_FAILURE = "settings/SAVE_FAILURE";

export const CHECK_LLM = "settings/CHECK_LLM";
export const CHECK_LLM_DONE = "settings/CHECK_LLM_DONE";

export const LOAD_LLM_CAPABILITIES = "settings/LOAD_LLM_CAPABILITIES";
export const LOAD_LLM_CAPABILITIES_SUCCESS = "settings/LOAD_LLM_CAPABILITIES_SUCCESS";

export const LOAD_LLM_MODELS_REQUESTED = "settings/LOAD_LLM_MODELS_REQUESTED";
export const LOAD_LLM_MODELS_SUCCEEDED = "settings/LOAD_LLM_MODELS_SUCCEEDED";
export const LOAD_LLM_MODELS_FAILED = "settings/LOAD_LLM_MODELS_FAILED";

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

export interface LoadLlmCapabilitiesAction {
  type: typeof LOAD_LLM_CAPABILITIES;
}

export interface LoadLlmCapabilitiesSuccessAction {
  type: typeof LOAD_LLM_CAPABILITIES_SUCCESS;
  payload: LlmCapabilities | null;
}

export interface LoadLlmModelsRequestedAction {
  type: typeof LOAD_LLM_MODELS_REQUESTED;
}

export interface LoadLlmModelsSucceededAction {
  type: typeof LOAD_LLM_MODELS_SUCCEEDED;
  payload: readonly LlmModelDescriptor[];
}

export interface LoadLlmModelsFailedAction {
  type: typeof LOAD_LLM_MODELS_FAILED;
}

export type SettingsAction =
  | LoadSettingsAction
  | LoadSettingsSuccessAction
  | LoadSettingsFailureAction
  | SaveSettingsAction
  | SaveSettingsSuccessAction
  | SaveSettingsFailureAction
  | CheckLlmAction
  | CheckLlmDoneAction
  | LoadLlmCapabilitiesAction
  | LoadLlmCapabilitiesSuccessAction
  | LoadLlmModelsRequestedAction
  | LoadLlmModelsSucceededAction
  | LoadLlmModelsFailedAction;

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

export const loadLlmCapabilities = (): LoadLlmCapabilitiesAction => ({
  type: LOAD_LLM_CAPABILITIES,
});
export const loadLlmCapabilitiesSuccess = (
  capabilities: LlmCapabilities | null
): LoadLlmCapabilitiesSuccessAction => ({
  type: LOAD_LLM_CAPABILITIES_SUCCESS,
  payload: capabilities,
});

export const loadLlmModelsRequested = (): LoadLlmModelsRequestedAction => ({
  type: LOAD_LLM_MODELS_REQUESTED,
});
export const loadLlmModelsSucceeded = (
  models: readonly LlmModelDescriptor[]
): LoadLlmModelsSucceededAction => ({
  type: LOAD_LLM_MODELS_SUCCEEDED,
  payload: models,
});
export const loadLlmModelsFailed = (): LoadLlmModelsFailedAction => ({
  type: LOAD_LLM_MODELS_FAILED,
});
