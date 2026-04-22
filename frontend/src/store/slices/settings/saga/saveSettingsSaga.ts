import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import type {AppSettings} from "../../../../domain/Settings";
import {notifyError} from "../../notifications";
import {SAVE_SETTINGS, type SaveSettingsAction, saveSettingsFailure, saveSettingsSuccess,} from "../actions";

export function* saveSettingsSaga(action: SaveSettingsAction): SagaIterator {
    const settingsApi = apiFactory.createSettingsApi();
    try {
        const saved: AppSettings = yield call(
            [settingsApi, settingsApi.saveSettings],
            action.payload,
        );
        yield put(saveSettingsSuccess(saved));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield put(notifyError({
            messageKey: "errors.genericErrorWithMessage",
            params: {message},
        }));
        yield put(saveSettingsFailure());
    }
}

export function* watchSaveSettings(): SagaIterator {
    yield takeLatest(SAVE_SETTINGS, saveSettingsSaga);
}
