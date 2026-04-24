import type { SagaIterator, Task } from "redux-saga";
import { cancel, cancelled, fork, put, take, takeLatest } from "redux-saga/effects";
import type { EventChannel } from "redux-saga";

import {
  MutationAcceptSyncDeviceDocument,
  QuerySyncPairingPayloadDocument,
  QuerySyncStatusDocument,
  SubscriptionSyncEventsDocument,
} from "../../../api/gql/graphql";
import type {
  MutationAcceptSyncDeviceMutation,
  QuerySyncPairingPayloadQuery,
  QuerySyncStatusQuery,
  SubscriptionSyncEventsSubscription,
} from "../../../api/gql/graphql";
import { gqlRequest, gqlSubscriptionChannel } from "../../saga/graphql";
import {
  ACCEPT_DEVICE,
  type AcceptDeviceAction,
  acceptDeviceFailure,
  acceptDeviceSuccess,
  LOAD_PAIRING,
  LOAD_STATUS,
  loadPairingFailure,
  loadPairingSuccess,
  loadSyncStatusFailure,
  loadSyncStatusSuccess,
  START_EVENT_STREAM,
  STOP_EVENT_STREAM,
  syncEventReceived,
  syncEventStreamConnected,
  syncEventStreamDisconnected,
} from "./actions";
import type { SyncEvent, SyncStatusSnapshot } from "./types";

function mapGqlStatus(data: QuerySyncStatusQuery): SyncStatusSnapshot | null {
  if (!data.syncStatus) return null;
  return {
    folders: data.syncStatus.folders.map((f) => ({
      id: f.id,
      state: f.state,
      completionPct: f.completionPct,
      conflicts: f.conflicts,
    })),
    devices: data.syncStatus.devices.map((d) => ({
      id: d.id,
      name: d.name,
      connected: d.connected,
      lastSeen: d.lastSeen ?? null,
    })),
  };
}

function mapGqlEvent(evt: SubscriptionSyncEventsSubscription["syncEvents"]): SyncEvent {
  return {
    id: Number(evt.id),
    type: evt.type,
    time: String(evt.time),
    folderCompletion: evt.folderCompletion
      ? { folderId: evt.folderCompletion.folder, completionPct: evt.folderCompletion.completion }
      : null,
    deviceConnection: evt.deviceConnection
      ? { deviceId: evt.deviceConnection.deviceId, connected: evt.deviceConnection.connected }
      : null,
    pendingDevices: evt.pendingDevices?.added.map((e) => ({
      deviceId: e.deviceId,
      name: e.name ?? "",
      address: e.address ?? null,
    })) ?? null,
    fileConflict: evt.fileConflict
      ? { folderId: evt.fileConflict.folder, path: evt.fileConflict.path }
      : null,
  };
}

export function* loadStatusSaga(): SagaIterator {
  try {
    const data = (yield* gqlRequest(QuerySyncStatusDocument, {})) as QuerySyncStatusQuery;
    const snapshot = mapGqlStatus(data);
    if (snapshot) {
      yield put(loadSyncStatusSuccess(snapshot));
    }
  } catch (error) {
    yield put(loadSyncStatusFailure(extractMessage(error)));
  }
}

export function* loadPairingSaga(): SagaIterator {
  try {
    const data = (yield* gqlRequest(QuerySyncPairingPayloadDocument, {})) as QuerySyncPairingPayloadQuery;
    if (data.syncPairingPayload) {
      yield put(loadPairingSuccess({
        deviceId: data.syncPairingPayload.deviceId,
        folderIds: [...data.syncPairingPayload.folderIds],
        uri: data.syncPairingPayload.uri,
      }));
    }
  } catch (error) {
    yield put(loadPairingFailure(extractMessage(error)));
  }
}

export function* acceptDeviceSaga(action: AcceptDeviceAction): SagaIterator {
  const { deviceId, name } = action.payload;
  try {
    const data = (yield* gqlRequest(MutationAcceptSyncDeviceDocument, { deviceId, name })) as MutationAcceptSyncDeviceMutation;
    if (data.acceptSyncDevice.errors.length > 0) {
      yield put(acceptDeviceFailure(deviceId, data.acceptSyncDevice.errors[0].message));
    } else {
      yield put(acceptDeviceSuccess(deviceId));
    }
  } catch (error) {
    yield put(acceptDeviceFailure(deviceId, extractMessage(error)));
  }
}

function* consumeChannel(channel: EventChannel<SubscriptionSyncEventsSubscription>): SagaIterator {
  try {
    yield put(syncEventStreamConnected());
    while (true) {
      const data: SubscriptionSyncEventsSubscription = yield take(channel);
      yield put(syncEventReceived(mapGqlEvent(data.syncEvents)));
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
    }
    yield put(syncEventStreamDisconnected());
  }
}

export function* syncEventStreamSaga(): SagaIterator {
  const channel: EventChannel<SubscriptionSyncEventsSubscription> = gqlSubscriptionChannel(
    SubscriptionSyncEventsDocument,
    {}
  );
  const consumer: Task = yield fork(consumeChannel, channel);

  try {
    yield take(STOP_EVENT_STREAM);
  } finally {
    yield cancel(consumer);
  }
}

export function* watchSyncEventStream(): SagaIterator {
  while (true) {
    yield take(START_EVENT_STREAM);
    yield fork(syncEventStreamSaga);
  }
}

export function* watchSyncSagas(): SagaIterator {
  yield takeLatest(LOAD_STATUS, loadStatusSaga);
  yield takeLatest(LOAD_PAIRING, loadPairingSaga);
  yield takeLatest(ACCEPT_DEVICE, acceptDeviceSaga);
  yield fork(watchSyncEventStream);
}

const extractMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return String(error);
};
