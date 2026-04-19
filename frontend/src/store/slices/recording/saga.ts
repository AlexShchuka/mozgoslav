import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";
import axios from "axios";
import {apiFactory} from "../../../api";
import type {Recording} from "../../../domain";
import {LOAD_RECORDINGS, loadRecordingsFailure, loadRecordingsSuccess, loadRecordingsUnavailable,} from "./actions";

export function* loadRecordingsSaga(): SagaIterator {
    const api = apiFactory.createRecordingApi();
    try {
        const recordings: Recording[] = yield call([api, api.getAll]);
        yield put(loadRecordingsSuccess(recordings));
    } catch (error) {
        if (isBackendDown(error)) {
            yield put(loadRecordingsUnavailable());
            return;
        }
        const message = error instanceof Error ? error.message : "Unknown error";
        yield put(loadRecordingsFailure(message));
    }
}

const isBackendDown = (error: unknown): boolean => {
    if (!axios.isAxiosError(error)) {
        return false;
    }
    if (!error.response) {
        return true;
    }
    return error.code === "ECONNREFUSED" || error.code === "ENOTFOUND";
};

export function* watchRecordingSagas(): SagaIterator {
    yield takeLatest(LOAD_RECORDINGS, loadRecordingsSaga);
}
