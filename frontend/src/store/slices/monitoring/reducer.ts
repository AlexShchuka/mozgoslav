import type { Reducer } from "redux";
import {
  MONITORING_LOAD_FAILED,
  MONITORING_LOAD_REQUESTED,
  MONITORING_LOAD_SUCCEEDED,
  MONITORING_REPROBE_FAILED,
  MONITORING_REPROBE_REQUESTED,
  MONITORING_REPROBE_SUCCEEDED,
  MONITORING_STATE_UPDATED,
  MONITORING_SUBSCRIBE,
  MONITORING_UNSUBSCRIBE,
  type MonitoringAction,
} from "./actions";
import { initialMonitoringState, type MonitoringState } from "./types";

export const monitoringReducer: Reducer<MonitoringState> = (
  state: MonitoringState = initialMonitoringState,
  action
): MonitoringState => {
  const typed = action as MonitoringAction;
  switch (typed.type) {
    case MONITORING_LOAD_REQUESTED:
      return { ...state, isLoading: true, error: null };
    case MONITORING_LOAD_SUCCEEDED:
      return {
        ...state,
        isLoading: false,
        runtimeState: typed.payload,
        error: null,
      };
    case MONITORING_LOAD_FAILED:
      return { ...state, isLoading: false, error: typed.payload };
    case MONITORING_SUBSCRIBE:
      return { ...state, isSubscribed: true };
    case MONITORING_UNSUBSCRIBE:
      return { ...state, isSubscribed: false };
    case MONITORING_STATE_UPDATED:
      return { ...state, runtimeState: typed.payload };
    case MONITORING_REPROBE_REQUESTED:
      return { ...state, isReprobing: true };
    case MONITORING_REPROBE_SUCCEEDED:
      return { ...state, isReprobing: false };
    case MONITORING_REPROBE_FAILED:
      return { ...state, isReprobing: false, error: typed.payload };
    default:
      return state;
  }
};
