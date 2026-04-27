import type { Reducer } from "redux";

import { type HealthAction, HEALTH_PROBE_RESULT } from "./actions";
import { initialHealthState, type HealthState } from "./types";

export const healthReducer: Reducer<HealthState> = (
  state: HealthState = initialHealthState,
  action
): HealthState => {
  const typed = action as HealthAction;
  switch (typed.type) {
    case HEALTH_PROBE_RESULT:
      return {
        status: typed.payload.status,
        lastCheckedAt: typed.payload.lastCheckedAt,
      };
    default:
      return state;
  }
};
