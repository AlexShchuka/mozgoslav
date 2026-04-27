import { createSelector } from "reselect";
import type { GlobalState } from "../../rootReducer";
import type { HealthState } from "./types";

const selectHealthState = (state: GlobalState): HealthState => state.health;

export const selectBackendHealth = createSelector(selectHealthState, (slice) => slice);
