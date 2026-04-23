import axios from "axios";
import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import type {ObsidianBulkExportError} from "../../../../api/ObsidianApi";
import {notifyError, notifyInfo, notifySuccess} from "../../notifications";
import {BULK_EXPORT, bulkExportDone, fetchDiagnostics} from "../actions";
import type {ObsidianBulkExportReport} from "../types";

export function* bulkExportSaga(): SagaIterator {
    const obsidianApi = apiFactory.createObsidianApi();
    try {
        const report: ObsidianBulkExportReport = yield call([
            obsidianApi,
            obsidianApi.bulkExport,
        ]);
        if (report.exportedCount === 0 && report.skippedCount > 0) {
            yield put(notifyInfo({
                messageKey: "obsidian.syncAllUpToDate",
                params: {count: report.skippedCount},
            }));
        } else {
            yield put(notifySuccess({
                messageKey: "obsidian.syncAllSuccess",
                params: {count: report.exportedCount},
            }));
        }
    } catch (error) {
        const enriched = extractEnrichedError(error);
        if (enriched) {
            yield put(notifyError({
                messageKey: `obsidian.emptyState.${enriched.error}`,
                params: {hint: enriched.hint},
            }));
            yield put(fetchDiagnostics());
        } else {
            const message = error instanceof Error ? error.message : String(error);
            yield put(notifyError({
                messageKey: "errors.genericErrorWithMessage",
                params: {message},
            }));
        }
    }
    yield put(bulkExportDone());
}

export function* watchBulkExport(): SagaIterator {
    yield takeLatest(BULK_EXPORT, bulkExportSaga);
}

function extractEnrichedError(error: unknown): ObsidianBulkExportError | null {
    if (!axios.isAxiosError(error)) return null;
    const body = error.response?.data;
    if (!body || typeof body !== "object") return null;
    const candidate = body as Partial<ObsidianBulkExportError>;
    if (typeof candidate.error !== "string" || typeof candidate.hint !== "string") return null;
    return {
        error: candidate.error,
        hint: candidate.hint,
        actions: Array.isArray(candidate.actions) ? candidate.actions : [],
    };
}
