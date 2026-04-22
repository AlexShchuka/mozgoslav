import {call, takeEvery} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import {RETRY_RECORDING, type RetryRecordingAction} from "../actions";

export function* retryRecordingSaga(action: RetryRecordingAction): SagaIterator {
    const api = apiFactory.createRecordingApi();
    try {
        yield call([api, api.reprocess], action.payload.recordingId, action.payload.profileId);
    } catch {
        // SSE will surface the new job; UI shows toast in S5 on terminal transition
    }
}

export function* watchRetryRecording(): SagaIterator {
    yield takeEvery(RETRY_RECORDING, retryRecordingSaga);
}
