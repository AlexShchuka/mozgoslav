import { expectSaga } from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import { throwError } from "redux-saga-test-plan/providers";

import {
  acceptDeviceSaga,
  loadPairingSaga,
  loadStatusSaga,
} from "../src/store/slices/sync/saga";
import {
  acceptDeviceFailure,
  acceptDeviceSuccess,
  loadPairingFailure,
  loadPairingSuccess,
  loadSyncStatusFailure,
  loadSyncStatusSuccess,
} from "../src/store/slices/sync/actions";
import { syncApi } from "../src/api/SyncApi";
import type {
  SyncPairingPayload,
  SyncStatusSnapshot,
} from "../src/store/slices/sync/types";

describe("syncSaga", () => {
  const snapshot: SyncStatusSnapshot = {
    folders: [{ id: "mozgoslav-notes", state: "idle", completionPct: 100, conflicts: 0 }],
    devices: [{ id: "AAAA", name: "phone", connected: true, lastSeen: null }],
  };
  const pairing: SyncPairingPayload = {
    deviceId: "AAAA-BBBB",
    folderIds: ["mozgoslav-recordings", "mozgoslav-notes"],
    uri: "mozgoslav://sync-pair?deviceId=AAAA-BBBB&folderId=mozgoslav-recordings,mozgoslav-notes&vaultEnabled=false",
  };

  describe("loadStatusSaga", () => {
    it("puts success with the snapshot returned by the API", () =>
      expectSaga(loadStatusSaga)
        .provide([[matchers.call.fn(syncApi.getStatus), snapshot]])
        .put(loadSyncStatusSuccess(snapshot))
        .run());

    it("puts failure with the error message on 503 / network errors", () =>
      expectSaga(loadStatusSaga)
        .provide([[matchers.call.fn(syncApi.getStatus), throwError(new Error("boom"))]])
        .put(loadSyncStatusFailure("boom"))
        .run());
  });

  describe("loadPairingSaga", () => {
    it("puts success with the pairing payload", () =>
      expectSaga(loadPairingSaga)
        .provide([[matchers.call.fn(syncApi.getPairingPayload), pairing]])
        .put(loadPairingSuccess(pairing))
        .run());

    it("puts failure when the endpoint is unavailable", () =>
      expectSaga(loadPairingSaga)
        .provide([
          [matchers.call.fn(syncApi.getPairingPayload), throwError(new Error("syncthing down"))],
        ])
        .put(loadPairingFailure("syncthing down"))
        .run());
  });

  describe("acceptDeviceSaga", () => {
    it("accepts and dispatches success", () =>
      expectSaga(acceptDeviceSaga, {
        type: "sync/ACCEPT_DEVICE",
        payload: { deviceId: "AAAA-BBBB", name: "phone" },
      })
        .provide([[matchers.call.fn(syncApi.acceptDevice), { accepted: true }]])
        .put(acceptDeviceSuccess("AAAA-BBBB"))
        .run());

    it("dispatches failure with device id when the API errors", () =>
      expectSaga(acceptDeviceSaga, {
        type: "sync/ACCEPT_DEVICE",
        payload: { deviceId: "AAAA-BBBB", name: "phone" },
      })
        .provide([[matchers.call.fn(syncApi.acceptDevice), throwError(new Error("nope"))]])
        .put(acceptDeviceFailure("AAAA-BBBB", "nope"))
        .run());
  });
});
