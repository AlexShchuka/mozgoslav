import {createSelector} from "reselect";
import type {GlobalState} from "../../rootReducer";
import type {SettingsState} from "./types";

const selectSettingsState = (state: GlobalState): SettingsState => state.settings;

export const selectSettings = createSelector(selectSettingsState, (slice) => slice.settings);
export const selectSettingsLoading = createSelector(
    selectSettingsState,
    (slice) => slice.isLoading,
);
export const selectSettingsSaving = createSelector(
    selectSettingsState,
    (slice) => slice.isSaving,
);
export const selectLlmProbing = createSelector(
    selectSettingsState,
    (slice) => slice.llmProbe.probing,
);
