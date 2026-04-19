import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {COMPLETE_ONBOARDING, completionPersistFailed,} from "../actions";
import {ONBOARDING_COMPLETE_STORAGE_KEY} from "../constants";

/**
 * Persists the completion flag so the guard redirects away from /onboarding
 * on the next app boot. Failures are reported to the slice but do not roll
 * back the in-memory flag — the user has already clicked Apply.
 */
export function* persistCompletionSaga(): SagaIterator {
    try {
        yield call(writeCompletionFlag);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield put(completionPersistFailed(message));
    }
}

const writeCompletionFlag = (): void => {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(ONBOARDING_COMPLETE_STORAGE_KEY, "true");
};

export function* watchPersistCompletion(): SagaIterator {
    yield takeLatest(COMPLETE_ONBOARDING, persistCompletionSaga);
}
