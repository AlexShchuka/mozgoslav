import type {UnknownAction} from "redux";

import {syncReducer} from "../src/store/slices/sync/reducer";
import {
    acceptDeviceFailure,
    acceptDeviceSuccess,
    loadPairingSuccess,
    loadSyncStatusSuccess,
    syncEventReceived,
    syncEventStreamConnected,
    syncEventStreamDisconnected,
} from "../src/store/slices/sync/actions";
import {initialSyncState, type SyncEvent, type SyncStatusSnapshot,} from "../src/store/slices/sync/types";

const action = (a: unknown): UnknownAction => a as UnknownAction;

const baseSnapshot: SyncStatusSnapshot = {
    folders: [
        {id: "mozgoslav-notes", state: "idle", completionPct: 50, conflicts: 0},
        {id: "mozgoslav-recordings", state: "syncing", completionPct: 80, conflicts: 1},
    ],
    devices: [{id: "AAAA", name: "phone", connected: false, lastSeen: null}],
};

const makeEvent = (overrides: Partial<SyncEvent>): SyncEvent => ({
    id: 1,
    type: "FolderCompletion",
    time: "2026-04-17T10:00:00Z",
    folderCompletion: null,
    deviceConnection: null,
    pendingDevices: null,
    fileConflict: null,
    ...overrides,
});

describe("syncReducer", () => {
    it("returns initial state by default", () => {
        expect(syncReducer(undefined, {type: "@@INIT"} as never)).toEqual(initialSyncState);
    });

    it("marks stream connected / disconnected", () => {
        const connected = syncReducer(initialSyncState, action(syncEventStreamConnected()));
        expect(connected.streamConnected).toBe(true);
        const disconnected = syncReducer(connected, action(syncEventStreamDisconnected()));
        expect(disconnected.streamConnected).toBe(false);
    });

    it("updates folder completion in place from a FolderCompletion event", () => {
        const loaded = syncReducer(initialSyncState, action(loadSyncStatusSuccess(baseSnapshot)));
        const event = makeEvent({
            folderCompletion: {folderId: "mozgoslav-notes", completionPct: 100},
        });
        const next = syncReducer(loaded, action(syncEventReceived(event)));
        expect(next.status?.folders[0].completionPct).toBe(100);
        expect(next.status?.folders[1].completionPct).toBe(80);
        expect(next.lastEvent).toEqual(event);
    });

    it("updates device connection from a DeviceConnection event", () => {
        const loaded = syncReducer(initialSyncState, action(loadSyncStatusSuccess(baseSnapshot)));
        const event = makeEvent({
            type: "DeviceConnected",
            deviceConnection: {deviceId: "AAAA", connected: true},
        });
        const next = syncReducer(loaded, action(syncEventReceived(event)));
        expect(next.status?.devices[0].connected).toBe(true);
    });

    it("merges incoming pending devices without duplicates", () => {
        const pending = [{deviceId: "X", name: "iPad", address: null}];
        const first = syncReducer(
            initialSyncState,
            action(syncEventReceived(makeEvent({pendingDevices: pending}))),
        );
        expect(first.pendingDevices).toHaveLength(1);

        const second = syncReducer(
            first,
            action(
                syncEventReceived(
                    makeEvent({
                        id: 2,
                        pendingDevices: [
                            {deviceId: "X", name: "iPad (renamed)", address: "10.0.0.1"},
                            {deviceId: "Y", name: "phone", address: null},
                        ],
                    }),
                ),
            ),
        );
        expect(second.pendingDevices).toHaveLength(2);
        expect(second.pendingDevices.find((d) => d.deviceId === "X")?.name).toBe("iPad (renamed)");
    });

    it("removes a pending device after accept success", () => {
        const first = syncReducer(
            initialSyncState,
            action(
                syncEventReceived(
                    makeEvent({pendingDevices: [{deviceId: "X", name: "iPad", address: null}]}),
                ),
            ),
        );
        const accepted = syncReducer(first, action(acceptDeviceSuccess("X")));
        expect(accepted.pendingDevices).toHaveLength(0);
        expect(accepted.acceptingDeviceId).toBeNull();
    });

    it("captures accept error in state", () => {
        const failed = syncReducer(initialSyncState, action(acceptDeviceFailure("X", "boom")));
        expect(failed.acceptError).toBe("boom");
        expect(failed.acceptingDeviceId).toBeNull();
    });

    it("stores pairing payload on success", () => {
        const pairing = {
            deviceId: "A",
            folderIds: ["mozgoslav-notes"],
            uri: "mozgoslav://sync-pair?deviceId=A",
        };
        const next = syncReducer(initialSyncState, action(loadPairingSuccess(pairing)));
        expect(next.pairing).toEqual(pairing);
        expect(next.isLoadingPairing).toBe(false);
    });
});
