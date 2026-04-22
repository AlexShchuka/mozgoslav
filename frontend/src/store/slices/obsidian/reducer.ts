import type {Reducer} from "redux";

import {
    APPLY_LAYOUT,
    APPLY_LAYOUT_DONE,
    BULK_EXPORT,
    BULK_EXPORT_DONE,
    type ObsidianAction,
    SETUP_OBSIDIAN,
    SETUP_OBSIDIAN_DONE,
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
        case SETUP_OBSIDIAN_DONE:
            return {...state, isSetupInProgress: false};

        case BULK_EXPORT:
            return beginBulkExport(state);
        case BULK_EXPORT_DONE:
            return {...state, isBulkExporting: false};

        case APPLY_LAYOUT:
            return beginApplyLayout(state);
        case APPLY_LAYOUT_DONE:
            return {...state, isApplyingLayout: false};

        default:
            return state;
    }
};
