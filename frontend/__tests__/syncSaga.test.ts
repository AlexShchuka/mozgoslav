import { expectSaga } from "redux-saga-test-plan";

import { acceptDeviceSaga, loadPairingSaga, loadStatusSaga } from "../src/store/slices/sync/saga";
import {
  acceptDeviceFailure,
  acceptDeviceSuccess,
  loadPairingFailure,
  loadPairingSuccess,
  loadSyncStatusFailure,
  loadSyncStatusSuccess,
} from "../src/store/slices/sync/actions";
import type { SyncPairingPayload, SyncStatusSnapshot } from "../src/store/slices/sync/types";

jest.mock("../src/api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(() => ({
    subscribe: jest.fn(() => () => {}),
    dispose: jest.fn(),
  })),
}));

import { graphqlClient } from "../src/api/graphqlClient";

const mockedRequest = graphqlClient.request as jest.Mock;

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

  beforeEach(() => jest.clearAllMocks());

  describe("loadStatusSaga", () => {
    it("puts success with the snapshot returned by the GQL API", async () => {
      mockedRequest.mockResolvedValueOnce({
        syncStatus: {
          folders: snapshot.folders.map((f) => ({
            id: f.id,
            state: f.state,
            completionPct: f.completionPct,
            conflicts: f.conflicts,
          })),
          devices: snapshot.devices.map((d) => ({
            id: d.id,
            name: d.name,
            connected: d.connected,
            lastSeen: null,
          })),
        },
      });

      return expectSaga(loadStatusSaga)
        .put(loadSyncStatusSuccess(snapshot))
        .run();
    });

    it("puts failure with the error message on network errors", async () => {
      mockedRequest.mockRejectedValueOnce(new Error("boom"));

      return expectSaga(loadStatusSaga)
        .put(loadSyncStatusFailure("boom"))
        .run();
    });
  });

  describe("loadPairingSaga", () => {
    it("puts success with the pairing payload", async () => {
      mockedRequest.mockResolvedValueOnce({
        syncPairingPayload: {
          deviceId: pairing.deviceId,
          folderIds: pairing.folderIds,
          uri: pairing.uri,
        },
      });

      return expectSaga(loadPairingSaga)
        .put(loadPairingSuccess(pairing))
        .run();
    });

    it("puts failure when the endpoint is unavailable", async () => {
      mockedRequest.mockRejectedValueOnce(new Error("syncthing down"));

      return expectSaga(loadPairingSaga)
        .put(loadPairingFailure("syncthing down"))
        .run();
    });
  });

  describe("acceptDeviceSaga", () => {
    it("accepts and dispatches success", async () => {
      mockedRequest.mockResolvedValueOnce({
        acceptSyncDevice: { errors: [] },
      });

      return expectSaga(acceptDeviceSaga, {
        type: "sync/ACCEPT_DEVICE",
        payload: { deviceId: "AAAA-BBBB", name: "phone" },
      })
        .put(acceptDeviceSuccess("AAAA-BBBB"))
        .run();
    });

    it("dispatches failure with device id when the API returns errors", async () => {
      mockedRequest.mockResolvedValueOnce({
        acceptSyncDevice: { errors: [{ message: "nope" }] },
      });

      return expectSaga(acceptDeviceSaga, {
        type: "sync/ACCEPT_DEVICE",
        payload: { deviceId: "AAAA-BBBB", name: "phone" },
      })
        .put(acceptDeviceFailure("AAAA-BBBB", "nope"))
        .run();
    });

    it("dispatches failure with device id when the API throws", async () => {
      mockedRequest.mockRejectedValueOnce(new Error("nope"));

      return expectSaga(acceptDeviceSaga, {
        type: "sync/ACCEPT_DEVICE",
        payload: { deviceId: "AAAA-BBBB", name: "phone" },
      })
        .put(acceptDeviceFailure("AAAA-BBBB", "nope"))
        .run();
    });
  });
});
