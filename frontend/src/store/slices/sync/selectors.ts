import type { GlobalState } from "../../rootReducer";
import type { SyncState } from "./types";

const root = (state: GlobalState): SyncState => state.sync;

export const selectSyncStatus = (state: GlobalState) => root(state).status;
export const selectSyncPairing = (state: GlobalState) => root(state).pairing;
export const selectSyncPendingDevices = (state: GlobalState) => root(state).pendingDevices;
export const selectSyncStreamConnected = (state: GlobalState) => root(state).streamConnected;
export const selectSyncIsLoadingStatus = (state: GlobalState) => root(state).isLoadingStatus;
export const selectSyncIsLoadingPairing = (state: GlobalState) => root(state).isLoadingPairing;
export const selectSyncAcceptingDeviceId = (state: GlobalState) => root(state).acceptingDeviceId;
export const selectSyncStatusError = (state: GlobalState) => root(state).statusError;
export const selectSyncPairingError = (state: GlobalState) => root(state).pairingError;
export const selectSyncAcceptError = (state: GlobalState) => root(state).acceptError;
export const selectSyncLastEvent = (state: GlobalState) => root(state).lastEvent;
