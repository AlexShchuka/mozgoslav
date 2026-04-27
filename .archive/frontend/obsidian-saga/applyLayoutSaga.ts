import { call, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { apiFactory } from "../../../../api";
import { notifyError, notifySuccess } from "../../notifications";
import { APPLY_LAYOUT, applyLayoutDone } from "../actions";
import type { ObsidianApplyLayoutReport } from "../types";

export function* applyLayoutSaga(): SagaIterator {
  const obsidianApi = apiFactory.createObsidianApi();
  try {
    const report: ObsidianApplyLayoutReport = yield call([obsidianApi, obsidianApi.applyLayout]);
    yield put(
      notifySuccess({
        messageKey: "obsidian.applyLayoutSuccess",
        params: { folders: report.createdFolders, notes: report.movedNotes },
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
  yield put(applyLayoutDone());
}

export function* watchApplyLayout(): SagaIterator {
  yield takeLatest(APPLY_LAYOUT, applyLayoutSaga);
}
