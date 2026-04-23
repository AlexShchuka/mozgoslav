import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import type {VaultDiagnosticsReport} from "../../../../api/ObsidianApi";
import {
    FETCH_DIAGNOSTICS,
    fetchDiagnosticsDone,
    fetchDiagnosticsFailed,
} from "../actions";

export function* diagnosticsSaga(): SagaIterator {
    const obsidianApi = apiFactory.createObsidianApi();
    try {
        const report: VaultDiagnosticsReport = yield call([obsidianApi, obsidianApi.diagnostics]);
        yield put(fetchDiagnosticsDone(report));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield put(fetchDiagnosticsFailed(message));
    }
}

export function* watchFetchDiagnostics(): SagaIterator {
    yield takeLatest(FETCH_DIAGNOSTICS, diagnosticsSaga);
}
