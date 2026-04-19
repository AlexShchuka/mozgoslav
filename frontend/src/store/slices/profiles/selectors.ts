import {createSelector} from "reselect";
import type {GlobalState} from "../../rootReducer";
import type {ProfilesState} from "./types";

const selectProfilesState = (state: GlobalState): ProfilesState => state.profiles;

export const selectAllProfiles = createSelector(selectProfilesState, (slice) =>
    slice.order.map((id) => slice.profiles[id]!).filter((profile) => profile !== undefined),
);

export const selectProfilesLoading = createSelector(
    selectProfilesState,
    (slice) => slice.isLoading,
);

export const selectProfilesSaving = createSelector(
    selectProfilesState,
    (slice) => slice.saving,
);

export const selectProfilesError = createSelector(
    selectProfilesState,
    (slice) => slice.error,
);

export const selectProfilesDeletingId = createSelector(
    selectProfilesState,
    (slice) => slice.deletingId,
);

export const selectProfileById = (id: string) =>
    createSelector(selectProfilesState, (slice) => slice.profiles[id] ?? null);
