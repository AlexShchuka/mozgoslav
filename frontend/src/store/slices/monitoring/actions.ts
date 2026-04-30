import type { RuntimeState } from "../../../api/gql/graphql";

export const MONITORING_LOAD_REQUESTED = "monitoring/LOAD_REQUESTED";
export const MONITORING_LOAD_SUCCEEDED = "monitoring/LOAD_SUCCEEDED";
export const MONITORING_LOAD_FAILED = "monitoring/LOAD_FAILED";
export const MONITORING_SUBSCRIBE = "monitoring/SUBSCRIBE";
export const MONITORING_UNSUBSCRIBE = "monitoring/UNSUBSCRIBE";
export const MONITORING_STATE_UPDATED = "monitoring/STATE_UPDATED";
export const MONITORING_REPROBE_REQUESTED = "monitoring/REPROBE_REQUESTED";
export const MONITORING_REPROBE_SUCCEEDED = "monitoring/REPROBE_SUCCEEDED";
export const MONITORING_REPROBE_FAILED = "monitoring/REPROBE_FAILED";

export interface MonitoringLoadRequestedAction {
  type: typeof MONITORING_LOAD_REQUESTED;
}

export interface MonitoringLoadSucceededAction {
  type: typeof MONITORING_LOAD_SUCCEEDED;
  payload: RuntimeState;
}

export interface MonitoringLoadFailedAction {
  type: typeof MONITORING_LOAD_FAILED;
  payload: string;
}

export interface MonitoringSubscribeAction {
  type: typeof MONITORING_SUBSCRIBE;
}

export interface MonitoringUnsubscribeAction {
  type: typeof MONITORING_UNSUBSCRIBE;
}

export interface MonitoringStateUpdatedAction {
  type: typeof MONITORING_STATE_UPDATED;
  payload: RuntimeState;
}

export interface MonitoringReprobeRequestedAction {
  type: typeof MONITORING_REPROBE_REQUESTED;
}

export interface MonitoringReprobeSucceededAction {
  type: typeof MONITORING_REPROBE_SUCCEEDED;
}

export interface MonitoringReprobeFailedAction {
  type: typeof MONITORING_REPROBE_FAILED;
  payload: string;
}

export type MonitoringAction =
  | MonitoringLoadRequestedAction
  | MonitoringLoadSucceededAction
  | MonitoringLoadFailedAction
  | MonitoringSubscribeAction
  | MonitoringUnsubscribeAction
  | MonitoringStateUpdatedAction
  | MonitoringReprobeRequestedAction
  | MonitoringReprobeSucceededAction
  | MonitoringReprobeFailedAction;

export const monitoringLoadRequested = (): MonitoringLoadRequestedAction => ({
  type: MONITORING_LOAD_REQUESTED,
});

export const monitoringLoadSucceeded = (state: RuntimeState): MonitoringLoadSucceededAction => ({
  type: MONITORING_LOAD_SUCCEEDED,
  payload: state,
});

export const monitoringLoadFailed = (error: string): MonitoringLoadFailedAction => ({
  type: MONITORING_LOAD_FAILED,
  payload: error,
});

export const monitoringSubscribe = (): MonitoringSubscribeAction => ({
  type: MONITORING_SUBSCRIBE,
});

export const monitoringUnsubscribe = (): MonitoringUnsubscribeAction => ({
  type: MONITORING_UNSUBSCRIBE,
});

export const monitoringStateUpdated = (state: RuntimeState): MonitoringStateUpdatedAction => ({
  type: MONITORING_STATE_UPDATED,
  payload: state,
});

export const monitoringReprobeRequested = (): MonitoringReprobeRequestedAction => ({
  type: MONITORING_REPROBE_REQUESTED,
});

export const monitoringReprobeSucceeded = (): MonitoringReprobeSucceededAction => ({
  type: MONITORING_REPROBE_SUCCEEDED,
});

export const monitoringReprobeFailed = (error: string): MonitoringReprobeFailedAction => ({
  type: MONITORING_REPROBE_FAILED,
  payload: error,
});
