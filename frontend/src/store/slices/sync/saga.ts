import type {SagaIterator, Task} from "redux-saga";
import {END, eventChannel, type EventChannel} from "redux-saga";
import {call, cancel, cancelled, fork, put, take, takeLatest} from "redux-saga/effects";

import {createSyncEventSource, syncApi} from "../../../api/SyncApi";
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
import type {SyncEvent} from "./types";

type StreamMessage =
    | { kind: "open" }
    | { kind: "event"; event: SyncEvent }
    | { kind: "error" };

export function* loadStatusSaga(): SagaIterator {
    try {
        const snapshot: Awaited<ReturnType<typeof syncApi.getStatus>> = yield call([
            syncApi,
            syncApi.getStatus,
        ]);
        yield put(loadSyncStatusSuccess(snapshot));
    } catch (error) {
        yield put(loadSyncStatusFailure(extractMessage(error)));
    }
}

export function* loadPairingSaga(): SagaIterator {
    try {
        const payload: Awaited<ReturnType<typeof syncApi.getPairingPayload>> = yield call([
            syncApi,
            syncApi.getPairingPayload,
        ]);
        yield put(loadPairingSuccess(payload));
    } catch (error) {
        yield put(loadPairingFailure(extractMessage(error)));
    }
}

export function* acceptDeviceSaga(action: AcceptDeviceAction): SagaIterator {
    const {deviceId, name} = action.payload;
    try {
        yield call([syncApi, syncApi.acceptDevice], deviceId, name);
        yield put(acceptDeviceSuccess(deviceId));
    } catch (error) {
        yield put(acceptDeviceFailure(deviceId, extractMessage(error)));
    }
}

export function* syncEventStreamSaga(): SagaIterator {
    const channel: EventChannel<StreamMessage> = yield call(buildEventChannel);
    try {
        while (true) {
            const message: StreamMessage = yield take(channel);
            if (message.kind === "open") {
                yield put(syncEventStreamConnected());
            } else if (message.kind === "event") {
                yield put(syncEventReceived(message.event));
            } else {
                yield put(syncEventStreamDisconnected());
            }
        }
    } finally {
        if (yield cancelled()) {
            channel.close();
            yield put(syncEventStreamDisconnected());
        }
    }
}

export function* watchSyncEventStream(): SagaIterator {
    while (true) {
        yield take(START_EVENT_STREAM);
        const task: Task = yield fork(syncEventStreamSaga);
        yield take(STOP_EVENT_STREAM);
        yield cancel(task);
    }
}

export function* watchSyncSagas(): SagaIterator {
    yield takeLatest(LOAD_STATUS, loadStatusSaga);
    yield takeLatest(LOAD_PAIRING, loadPairingSaga);
    yield takeLatest(ACCEPT_DEVICE, acceptDeviceSaga);
    yield fork(watchSyncEventStream);
}


export const buildEventChannel = (): EventChannel<StreamMessage> =>
    eventChannel<StreamMessage>((emit) => {
        const source = createSyncEventSource();
        source.onopen = () => emit({kind: "open"});
        source.onerror = () => {
            emit({kind: "error"});
        };
        source.addEventListener("syncthing", (raw) => {
            const messageEvent = raw as MessageEvent<string>;
            try {
                const parsed: SyncEvent = JSON.parse(messageEvent.data);
                emit({kind: "event", event: parsed});
            } catch {
            }
        });
        return () => {
            source.close();
            emit(END);
        };
    });

const extractMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
};
