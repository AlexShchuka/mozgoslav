import { call, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { apiFactory } from "../../../../api";
import type { AppSettings } from "../../../../domain/Settings";
import { notifyError } from "../../notifications";
import { LOAD_SETTINGS, loadSettingsFailure, loadSettingsSuccess } from "../actions";

export function* loadSettingsSaga(): SagaIterator {
  const settingsApi = apiFactory.createSettingsApi();
  try {
    const settings: AppSettings = yield call([settingsApi, settingsApi.getSettings]);
    yield put(loadSettingsSuccess(settings));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(
      notifyError({
        messageKey: "errors.genericErrorWithMessage",
        params: { message },
      })
    );
    yield put(loadSettingsFailure());
  }
}

export function* watchLoadSettings(): SagaIterator {
  yield takeLatest(LOAD_SETTINGS, loadSettingsSaga);
}
