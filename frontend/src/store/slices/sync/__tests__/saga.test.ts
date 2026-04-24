import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient, getGraphqlWsClient } from "../../../../api/graphqlClient";

import {
  loadSyncStatus,
  loadSyncStatusSuccess,
  loadSyncStatusFailure,
  loadPairingPayload,
  loadPairingSuccess,
  loadPairingFailure,
  acceptDevice,
  acceptDeviceSuccess,
  acceptDeviceFailure,
} from "../actions";
import type { SyncPendingDevice } from "../types";
import { syncReducer } from "../reducer";
import { loadStatusSaga, loadPairingSaga, acceptDeviceSaga, syncEventStreamSaga } from "../saga";

const mockedRequest = graphqlClient.request as jest.Mock;

const stubStatus = {
  syncStatus: {
    folders: [{ id: "obsidian-vault", state: "idle", completionPct: 87, conflicts: 3 }],
    devices: [{ id: "DEV-1", name: "iPhone", connected: true, lastSeen: null }],
  },
};

const stubPairing = {
  syncPairingPayload: { deviceId: "dev-1", folderIds: [], uri: "syncthing://" },
};

const stubDevice: SyncPendingDevice = { deviceId: "DEV-1", name: "iPhone", address: null };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("loadStatusSaga", () => {
  it("dispatches LOAD_STATUS_SUCCESS on success", async () => {
    mockedRequest.mockResolvedValueOnce(stubStatus);

    await expectSaga(loadStatusSaga)
      .withReducer(syncReducer)
      .dispatch(loadSyncStatus())
      .put(
        loadSyncStatusSuccess({
          folders: [{ id: "obsidian-vault", state: "idle", completionPct: 87, conflicts: 3 }],
          devices: [{ id: "DEV-1", name: "iPhone", connected: true, lastSeen: null }],
        })
      )
      .silentRun(50);
  });

  it("dispatches LOAD_STATUS_FAILURE on error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    await expectSaga(loadStatusSaga)
      .withReducer(syncReducer)
      .put(loadSyncStatusFailure("timeout"))
      .silentRun(50);
  });
});

describe("loadPairingSaga", () => {
  it("dispatches LOAD_PAIRING_SUCCESS on success", async () => {
    mockedRequest.mockResolvedValueOnce(stubPairing);

    await expectSaga(loadPairingSaga)
      .withReducer(syncReducer)
      .dispatch(loadPairingPayload())
      .put(loadPairingSuccess({ deviceId: "dev-1", folderIds: [], uri: "syncthing://" }))
      .silentRun(50);
  });

  it("dispatches LOAD_PAIRING_FAILURE on error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network error"));

    await expectSaga(loadPairingSaga)
      .withReducer(syncReducer)
      .put(loadPairingFailure("network error"))
      .silentRun(50);
  });
});

describe("acceptDeviceSaga", () => {
  it("dispatches ACCEPT_DEVICE_SUCCESS on success", async () => {
    mockedRequest.mockResolvedValueOnce({
      acceptSyncDevice: { errors: [] },
    });

    await expectSaga(acceptDeviceSaga, acceptDevice(stubDevice))
      .withReducer(syncReducer)
      .put(acceptDeviceSuccess("DEV-1"))
      .silentRun(50);
  });

  it("dispatches ACCEPT_DEVICE_FAILURE when API returns errors", async () => {
    mockedRequest.mockResolvedValueOnce({
      acceptSyncDevice: { errors: [{ message: "already accepted" }] },
    });

    await expectSaga(acceptDeviceSaga, acceptDevice(stubDevice))
      .withReducer(syncReducer)
      .put(acceptDeviceFailure("DEV-1", "already accepted"))
      .silentRun(50);
  });

  it("dispatches ACCEPT_DEVICE_FAILURE on network error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("connection refused"));

    await expectSaga(acceptDeviceSaga, acceptDevice(stubDevice))
      .withReducer(syncReducer)
      .put(acceptDeviceFailure("DEV-1", "connection refused"))
      .silentRun(50);
  });
});

describe("syncEventStreamSaga — minimal subscription check", () => {
  it("starts without throwing when ws client is configured", async () => {
    const mockedGetWsClient = getGraphqlWsClient as jest.Mock;
    const dispose = jest.fn().mockResolvedValue(undefined);
    const subscribe = jest.fn(() => () => {});
    mockedGetWsClient.mockReturnValue({ subscribe, dispose });

    await expectSaga(syncEventStreamSaga).withReducer(syncReducer).silentRun(50);

    expect(subscribe).toHaveBeenCalled();
  });
});
