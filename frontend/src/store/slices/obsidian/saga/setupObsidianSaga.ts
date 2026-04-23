import { call, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { apiFactory } from "../../../../api";
import { notifyError, notifySuccess } from "../../notifications";
import { SETUP_OBSIDIAN, type SetupObsidianAction, setupObsidianDone } from "../actions";
import type { ObsidianSetupReport } from "../types";

export function* setupObsidianSaga(action: SetupObsidianAction): SagaIterator {
  const obsidianApi = apiFactory.createObsidianApi();
  try {
    const report: ObsidianSetupReport = yield call(
      [obsidianApi, obsidianApi.setup],
      action.payload.vaultPath
    );
    yield put(
      notifySuccess({
        messageKey: "obsidian.setupSuccess",
        params: { created: report.createdPaths.length },
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(
      notifyError({
        messageKey: "errors.genericErrorWithMessage",
        params: { message },
      })
    );
  }
  yield put(setupObsidianDone());
}

export function* watchSetupObsidian(): SagaIterator {
  yield takeLatest(SETUP_OBSIDIAN, setupObsidianSaga);
}
