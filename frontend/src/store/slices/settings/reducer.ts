import type {Reducer} from "redux";

import {
    CHECK_LLM,
    CHECK_LLM_DONE,
    LOAD_SETTINGS,
    LOAD_SETTINGS_FAILURE,
    LOAD_SETTINGS_SUCCESS,
    SAVE_SETTINGS,
    SAVE_SETTINGS_FAILURE,
    SAVE_SETTINGS_SUCCESS,
    type SettingsAction,
} from "./actions";
import {applyLoaded, applySaved, markLlmProbing, settleLlmProbing} from "./mutations";
import {initialSettingsState, type SettingsState} from "./types";

export const settingsReducer: Reducer<SettingsState> = (
    state: SettingsState = initialSettingsState,
    action,
): SettingsState => {
    const typed = action as SettingsAction;
    switch (typed.type) {
        case LOAD_SETTINGS:
            return {...state, isLoading: true, error: null};
        case LOAD_SETTINGS_SUCCESS:
            return applyLoaded(state, typed.payload);
        case LOAD_SETTINGS_FAILURE:
            return {...state, isLoading: false, error: typed.payload};

        case SAVE_SETTINGS:
            return {...state, isSaving: true, error: null};
        case SAVE_SETTINGS_SUCCESS:
            return applySaved(state, typed.payload);
        case SAVE_SETTINGS_FAILURE:
            return {...state, isSaving: false, error: typed.payload};

        case CHECK_LLM:
            return markLlmProbing(state);
        case CHECK_LLM_DONE:
            return settleLlmProbing(state);

        default:
            return state;
    }
};
