import type { Reducer } from "redux";

import {
  CHECK_LLM,
  CHECK_LLM_DONE,
  LOAD_LLM_CAPABILITIES_SUCCESS,
  LOAD_LLM_MODELS_FAILED,
  LOAD_LLM_MODELS_REQUESTED,
  LOAD_LLM_MODELS_SUCCEEDED,
  LOAD_SETTINGS,
  LOAD_SETTINGS_FAILURE,
  LOAD_SETTINGS_SUCCESS,
  SAVE_SETTINGS,
  SAVE_SETTINGS_FAILURE,
  SAVE_SETTINGS_SUCCESS,
  type SettingsAction,
} from "./actions";
import {
  applyLlmCapabilities,
  applyLlmModelsLoaded,
  applyLoaded,
  applySaved,
  markLlmModelsFailed,
  markLlmModelsLoading,
  markLlmProbing,
  settleLlmProbing,
} from "./mutations";
import { initialSettingsState, type SettingsState } from "./types";

export const settingsReducer: Reducer<SettingsState> = (
  state: SettingsState = initialSettingsState,
  action
): SettingsState => {
  const typed = action as SettingsAction;
  switch (typed.type) {
    case LOAD_SETTINGS:
      return { ...state, isLoading: true };
    case LOAD_SETTINGS_SUCCESS:
      return applyLoaded(state, typed.payload);
    case LOAD_SETTINGS_FAILURE:
      return { ...state, isLoading: false };

    case SAVE_SETTINGS:
      return { ...state, isSaving: true };
    case SAVE_SETTINGS_SUCCESS:
      return applySaved(state, typed.payload);
    case SAVE_SETTINGS_FAILURE:
      return { ...state, isSaving: false };

    case CHECK_LLM:
      return markLlmProbing(state);
    case CHECK_LLM_DONE:
      return settleLlmProbing(state);

    case LOAD_LLM_CAPABILITIES_SUCCESS:
      return applyLlmCapabilities(state, typed.payload);

    case LOAD_LLM_MODELS_REQUESTED:
      return markLlmModelsLoading(state);
    case LOAD_LLM_MODELS_SUCCEEDED:
      return applyLlmModelsLoaded(state, typed.payload);
    case LOAD_LLM_MODELS_FAILED:
      return markLlmModelsFailed(state);

    default:
      return state;
  }
};
