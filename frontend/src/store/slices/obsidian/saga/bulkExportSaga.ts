import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import {BULK_EXPORT, bulkExportFailure, bulkExportSuccess} from "../actions";
import type {ObsidianBulkExportReport} from "../types";

export function* bulkExportSaga(): SagaIterator {
    const obsidianApi = apiFactory.createObsidianApi();
    try {
        const report: ObsidianBulkExportReport = yield call([
            obsidianApi,
            obsidianApi.bulkExport,
        ]);
        yield put(bulkExportSuccess(report));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield put(bulkExportFailure(message));
    }
}

export function* watchBulkExport(): SagaIterator {
    yield takeLatest(BULK_EXPORT, bulkExportSaga);
}
