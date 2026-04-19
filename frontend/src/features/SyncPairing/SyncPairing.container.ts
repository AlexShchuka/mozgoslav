import {connect} from "react-redux";

import {
    acceptDevice,
    loadPairingPayload,
    loadSyncStatus,
    selectSyncAcceptError,
    selectSyncAcceptingDeviceId,
    selectSyncIsLoadingPairing,
    selectSyncIsLoadingStatus,
    selectSyncPairing,
    selectSyncPairingError,
    selectSyncPendingDevices,
    selectSyncStatus,
    selectSyncStatusError,
    selectSyncStreamConnected,
    startSyncEventStream,
    stopSyncEventStream,
} from "../../store/slices/sync";
import type {GlobalState} from "../../store/rootReducer";
import SyncPairing, {type SyncPairingProps} from "./SyncPairing";

type StateProps = Pick<
    SyncPairingProps,
    | "status"
    | "pairing"
    | "pendingDevices"
    | "streamConnected"
    | "isLoadingStatus"
    | "isLoadingPairing"
    | "acceptingDeviceId"
    | "statusError"
    | "pairingError"
    | "acceptError"
>;

type DispatchProps = Pick<
    SyncPairingProps,
    "loadStatus" | "loadPairing" | "acceptDevice" | "startEventStream" | "stopEventStream"
>;

const mapStateToProps = (state: GlobalState): StateProps => ({
    status: selectSyncStatus(state),
    pairing: selectSyncPairing(state),
    pendingDevices: selectSyncPendingDevices(state),
    streamConnected: selectSyncStreamConnected(state),
    isLoadingStatus: selectSyncIsLoadingStatus(state),
    isLoadingPairing: selectSyncIsLoadingPairing(state),
    acceptingDeviceId: selectSyncAcceptingDeviceId(state),
    statusError: selectSyncStatusError(state),
    pairingError: selectSyncPairingError(state),
    acceptError: selectSyncAcceptError(state),
});

const mapDispatchToProps: DispatchProps = {
    loadStatus: loadSyncStatus,
    loadPairing: loadPairingPayload,
    acceptDevice,
    startEventStream: startSyncEventStream,
    stopEventStream: stopSyncEventStream,
};

export default connect(mapStateToProps, mapDispatchToProps)(SyncPairing);
