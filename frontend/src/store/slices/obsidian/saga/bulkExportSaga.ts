import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import {notifyError, notifySuccess} from "../../notifications";
import {BULK_EXPORT, bulkExportDone} from "../actions";
import type {ObsidianBulkExportReport} from "../types";

export function* bulkExportSaga(): SagaIterator {
    const obsidianApi = apiFactory.createObsidianApi();
    try {
        const report: ObsidianBulkExportReport = yield call([
            obsidianApi,
            obsidianApi.bulkExport,
        ]);
        yield put(notifySuccess({
            messageKey: "obsidian.syncAllSuccess",
            params: {count: report.exportedCount},
        }));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield put(notifyError({
            messageKey: "errors.genericErrorWithMessage",
            params: {message},
        }));
    }
    yield put(bulkExportDone());
}

export function* watchBulkExport(): SagaIterator {
    yield takeLatest(BULK_EXPORT, bulkExportSaga);
}
