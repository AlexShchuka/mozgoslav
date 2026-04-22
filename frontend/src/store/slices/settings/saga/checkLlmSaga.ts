import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import {notifySuccess, notifyWarning} from "../../notifications";
import {CHECK_LLM, checkLlmDone} from "../actions";

export function* checkLlmSaga(): SagaIterator {
    const healthApi = apiFactory.createHealthApi();
    let ok = false;
    try {
        ok = yield call([healthApi, healthApi.checkLlm]);
    } catch {
        ok = false;
    }
    if (ok) {
        yield put(notifySuccess({messageKey: "settings.llmCheckSuccessToast"}));
    } else {
        yield put(notifyWarning({messageKey: "settings.llmCheckFailureToast"}));
    }
    yield put(checkLlmDone());
}

export function* watchCheckLlm(): SagaIterator {
    yield takeLatest(CHECK_LLM, checkLlmSaga);
}
