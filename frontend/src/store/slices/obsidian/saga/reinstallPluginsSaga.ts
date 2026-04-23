import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import type {ObsidianReinstallResult} from "../../../../api/ObsidianApi";
import {notifyError, notifySuccess} from "../../notifications";
import {
    REINSTALL_PLUGINS,
    fetchDiagnosticsDone,
    reinstallPluginsDone,
} from "../actions";

export function* reinstallPluginsSaga(): SagaIterator {
    const obsidianApi = apiFactory.createObsidianApi();
    try {
        const result: ObsidianReinstallResult = yield call([obsidianApi, obsidianApi.reinstallPlugins]);
        yield put(fetchDiagnosticsDone(result.report));
        const installed = result.plugins.filter((p) => p.status === "Installed" || p.status === "AlreadyInstalled").length;
        yield put(notifySuccess({
            messageKey: "obsidian.diagnostics.reinstallPluginsSuccess",
            params: {count: installed},
        }));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield put(notifyError({messageKey: "errors.genericErrorWithMessage", params: {message}}));
    }
    yield put(reinstallPluginsDone());
}

export function* watchReinstallPlugins(): SagaIterator {
    yield takeLatest(REINSTALL_PLUGINS, reinstallPluginsSaga);
}
