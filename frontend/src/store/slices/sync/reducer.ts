import type { Reducer } from "redux";

import {
  ACCEPT_DEVICE,
  ACCEPT_DEVICE_FAILURE,
  ACCEPT_DEVICE_SUCCESS,
  EVENT_RECEIVED,
  EVENT_STREAM_CONNECTED,
  EVENT_STREAM_DISCONNECTED,
  LOAD_PAIRING,
  LOAD_PAIRING_FAILURE,
  LOAD_PAIRING_SUCCESS,
  LOAD_STATUS,
  LOAD_STATUS_FAILURE,
  LOAD_STATUS_SUCCESS,
  type SyncAction,
} from "./actions";
import {
  initialSyncState,
  type SyncEvent,
  type SyncPendingDevice,
  type SyncState,
  type SyncStatusSnapshot,
} from "./types";

export const syncReducer: Reducer<SyncState> = (
  state: SyncState = initialSyncState,
  action
): SyncState => {
  const typed = action as SyncAction;
  switch (typed.type) {
    case LOAD_STATUS:
      return { ...state, isLoadingStatus: true, statusError: null };
    case LOAD_STATUS_SUCCESS:
      return {
        ...state,
        isLoadingStatus: false,
        status: typed.payload,
        statusError: null,
      };
    case LOAD_STATUS_FAILURE:
      return { ...state, isLoadingStatus: false, statusError: typed.payload };

    case LOAD_PAIRING:
      return { ...state, isLoadingPairing: true, pairingError: null };
    case LOAD_PAIRING_SUCCESS:
      return {
        ...state,
        isLoadingPairing: false,
        pairing: typed.payload,
        pairingError: null,
      };
    case LOAD_PAIRING_FAILURE:
      return { ...state, isLoadingPairing: false, pairingError: typed.payload };

    case ACCEPT_DEVICE:
      return { ...state, acceptingDeviceId: typed.payload.deviceId, acceptError: null };
    case ACCEPT_DEVICE_SUCCESS:
      return {
        ...state,
        acceptingDeviceId: null,
        pendingDevices: state.pendingDevices.filter(
          (d) => d.deviceId !== typed.payload.deviceId
        ),
      };
    case ACCEPT_DEVICE_FAILURE:
      return {
        ...state,
        acceptingDeviceId: null,
        acceptError: typed.payload.error,
      };

    case EVENT_STREAM_CONNECTED:
      return { ...state, streamConnected: true };
    case EVENT_STREAM_DISCONNECTED:
      return { ...state, streamConnected: false };

    case EVENT_RECEIVED:
      return applyEvent(state, typed.payload);

    default:
      return state;
  }
};

const applyEvent = (state: SyncState, event: SyncEvent): SyncState => {
  let next: SyncState = { ...state, lastEvent: event };

  if (event.folderCompletion && state.status) {
    next = {
      ...next,
      status: updateFolder(state.status, event.folderCompletion.folderId, {
        completionPct: event.folderCompletion.completionPct,
      }),
    };
  }

  if (event.deviceConnection && state.status) {
    next = {
      ...next,
      status: updateDevice(state.status, event.deviceConnection.deviceId, {
        connected: event.deviceConnection.connected,
      }),
    };
  }

  if (event.pendingDevices && event.pendingDevices.length > 0) {
    next = { ...next, pendingDevices: mergePending(state.pendingDevices, event.pendingDevices) };
  }

  return next;
};

const updateFolder = (
  snapshot: SyncStatusSnapshot,
  folderId: string,
  patch: { completionPct: number }
): SyncStatusSnapshot => ({
  ...snapshot,
  folders: snapshot.folders.map((f) => (f.id === folderId ? { ...f, ...patch } : f)),
});

const updateDevice = (
  snapshot: SyncStatusSnapshot,
  deviceId: string,
  patch: { connected: boolean }
): SyncStatusSnapshot => ({
  ...snapshot,
  devices: snapshot.devices.map((d) => (d.id === deviceId ? { ...d, ...patch } : d)),
});

const mergePending = (
  existing: readonly SyncPendingDevice[],
  incoming: readonly SyncPendingDevice[]
): readonly SyncPendingDevice[] => {
  const byId = new Map(existing.map((d) => [d.deviceId, d]));
  for (const device of incoming) {
    byId.set(device.deviceId, device);
  }
  return Array.from(byId.values());
};
