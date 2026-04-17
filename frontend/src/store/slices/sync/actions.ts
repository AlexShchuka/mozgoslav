import type {
  SyncEvent,
  SyncPairingPayload,
  SyncPendingDevice,
  SyncStatusSnapshot,
} from "./types";

export const LOAD_STATUS = "sync/LOAD_STATUS";
export const LOAD_STATUS_SUCCESS = "sync/LOAD_STATUS_SUCCESS";
export const LOAD_STATUS_FAILURE = "sync/LOAD_STATUS_FAILURE";

export const LOAD_PAIRING = "sync/LOAD_PAIRING";
export const LOAD_PAIRING_SUCCESS = "sync/LOAD_PAIRING_SUCCESS";
export const LOAD_PAIRING_FAILURE = "sync/LOAD_PAIRING_FAILURE";

export const ACCEPT_DEVICE = "sync/ACCEPT_DEVICE";
export const ACCEPT_DEVICE_SUCCESS = "sync/ACCEPT_DEVICE_SUCCESS";
export const ACCEPT_DEVICE_FAILURE = "sync/ACCEPT_DEVICE_FAILURE";

export const START_EVENT_STREAM = "sync/START_EVENT_STREAM";
export const STOP_EVENT_STREAM = "sync/STOP_EVENT_STREAM";
export const EVENT_STREAM_CONNECTED = "sync/EVENT_STREAM_CONNECTED";
export const EVENT_STREAM_DISCONNECTED = "sync/EVENT_STREAM_DISCONNECTED";
export const EVENT_RECEIVED = "sync/EVENT_RECEIVED";

export interface LoadStatusAction {
  type: typeof LOAD_STATUS;
}
export interface LoadStatusSuccessAction {
  type: typeof LOAD_STATUS_SUCCESS;
  payload: SyncStatusSnapshot;
}
export interface LoadStatusFailureAction {
  type: typeof LOAD_STATUS_FAILURE;
  payload: string;
}
export interface LoadPairingAction {
  type: typeof LOAD_PAIRING;
}
export interface LoadPairingSuccessAction {
  type: typeof LOAD_PAIRING_SUCCESS;
  payload: SyncPairingPayload;
}
export interface LoadPairingFailureAction {
  type: typeof LOAD_PAIRING_FAILURE;
  payload: string;
}
export interface AcceptDeviceAction {
  type: typeof ACCEPT_DEVICE;
  payload: { deviceId: string; name: string };
}
export interface AcceptDeviceSuccessAction {
  type: typeof ACCEPT_DEVICE_SUCCESS;
  payload: { deviceId: string };
}
export interface AcceptDeviceFailureAction {
  type: typeof ACCEPT_DEVICE_FAILURE;
  payload: { deviceId: string; error: string };
}
export interface StartEventStreamAction {
  type: typeof START_EVENT_STREAM;
}
export interface StopEventStreamAction {
  type: typeof STOP_EVENT_STREAM;
}
export interface EventStreamConnectedAction {
  type: typeof EVENT_STREAM_CONNECTED;
}
export interface EventStreamDisconnectedAction {
  type: typeof EVENT_STREAM_DISCONNECTED;
}
export interface EventReceivedAction {
  type: typeof EVENT_RECEIVED;
  payload: SyncEvent;
}

export type SyncAction =
  | LoadStatusAction
  | LoadStatusSuccessAction
  | LoadStatusFailureAction
  | LoadPairingAction
  | LoadPairingSuccessAction
  | LoadPairingFailureAction
  | AcceptDeviceAction
  | AcceptDeviceSuccessAction
  | AcceptDeviceFailureAction
  | StartEventStreamAction
  | StopEventStreamAction
  | EventStreamConnectedAction
  | EventStreamDisconnectedAction
  | EventReceivedAction;

export const loadSyncStatus = (): LoadStatusAction => ({ type: LOAD_STATUS });
export const loadSyncStatusSuccess = (snapshot: SyncStatusSnapshot): LoadStatusSuccessAction => ({
  type: LOAD_STATUS_SUCCESS,
  payload: snapshot,
});
export const loadSyncStatusFailure = (message: string): LoadStatusFailureAction => ({
  type: LOAD_STATUS_FAILURE,
  payload: message,
});

export const loadPairingPayload = (): LoadPairingAction => ({ type: LOAD_PAIRING });
export const loadPairingSuccess = (payload: SyncPairingPayload): LoadPairingSuccessAction => ({
  type: LOAD_PAIRING_SUCCESS,
  payload,
});
export const loadPairingFailure = (message: string): LoadPairingFailureAction => ({
  type: LOAD_PAIRING_FAILURE,
  payload: message,
});

export const acceptDevice = (device: SyncPendingDevice): AcceptDeviceAction => ({
  type: ACCEPT_DEVICE,
  payload: { deviceId: device.deviceId, name: device.name },
});
export const acceptDeviceSuccess = (deviceId: string): AcceptDeviceSuccessAction => ({
  type: ACCEPT_DEVICE_SUCCESS,
  payload: { deviceId },
});
export const acceptDeviceFailure = (deviceId: string, error: string): AcceptDeviceFailureAction => ({
  type: ACCEPT_DEVICE_FAILURE,
  payload: { deviceId, error },
});

export const startSyncEventStream = (): StartEventStreamAction => ({ type: START_EVENT_STREAM });
export const stopSyncEventStream = (): StopEventStreamAction => ({ type: STOP_EVENT_STREAM });
export const syncEventStreamConnected = (): EventStreamConnectedAction => ({
  type: EVENT_STREAM_CONNECTED,
});
export const syncEventStreamDisconnected = (): EventStreamDisconnectedAction => ({
  type: EVENT_STREAM_DISCONNECTED,
});
export const syncEventReceived = (event: SyncEvent): EventReceivedAction => ({
  type: EVENT_RECEIVED,
  payload: event,
});
