import type {Reducer} from "redux";

import {
    APPLY_LAYOUT,
    APPLY_LAYOUT_DONE,
    BULK_EXPORT,
    BULK_EXPORT_FAILURE,
    BULK_EXPORT_SUCCESS,
    type ObsidianAction,
    SETUP_OBSIDIAN,
    SETUP_OBSIDIAN_FAILURE,
    SETUP_OBSIDIAN_SUCCESS,
} from "./actions";
import {beginApplyLayout, beginBulkExport, beginSetup} from "./mutations";
import {initialObsidianState, type ObsidianState} from "./types";

export const obsidianReducer: Reducer<ObsidianState> = (
    state: ObsidianState = initialObsidianState,
    action,
): ObsidianState => {
    const typed = action as ObsidianAction;
    switch (typed.type) {
        case SETUP_OBSIDIAN:
            return beginSetup(state);
        case SETUP_OBSIDIAN_SUCCESS:
            return {
                ...state,
                isSetupInProgress: false,
                lastSetupReport: typed.payload,
                error: null,
            };
        case SETUP_OBSIDIAN_FAILURE:
            return {...state, isSetupInProgress: false, error: typed.payload};

        case BULK_EXPORT:
            return beginBulkExport(state);
        case BULK_EXPORT_SUCCESS:
            return {
                ...state,
                isBulkExporting: false,
                lastBulkExportReport: typed.payload,
                error: null,
            };
        case BULK_EXPORT_FAILURE:
            return {...state, isBulkExporting: false, error: typed.payload};

        case APPLY_LAYOUT:
            return beginApplyLayout(state);
        case APPLY_LAYOUT_DONE:
            return {...state, isApplyingLayout: false, error: null};

        default:
            return state;
    }
};
