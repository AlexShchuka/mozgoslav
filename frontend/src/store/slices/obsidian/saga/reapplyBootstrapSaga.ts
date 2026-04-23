import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import type {ObsidianReapplyResult} from "../../../../api/ObsidianApi";
import {notifyError, notifySuccess} from "../../notifications";
import {
    REAPPLY_BOOTSTRAP,
    fetchDiagnosticsDone,
    reapplyBootstrapDone,
} from "../actions";

export function* reapplyBootstrapSaga(): SagaIterator {
    const obsidianApi = apiFactory.createObsidianApi();
    try {
        const result: ObsidianReapplyResult = yield call([obsidianApi, obsidianApi.reapplyBootstrap]);
        yield put(fetchDiagnosticsDone(result.report));
        yield put(notifySuccess({messageKey: "obsidian.diagnostics.reapplyBootstrapSuccess"}));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield put(notifyError({messageKey: "errors.genericErrorWithMessage", params: {message}}));
    }
    yield put(reapplyBootstrapDone());
}

export function* watchReapplyBootstrap(): SagaIterator {
    yield takeLatest(REAPPLY_BOOTSTRAP, reapplyBootstrapSaga);
}
