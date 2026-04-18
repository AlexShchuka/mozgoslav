import { call, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { apiFactory } from "../../../../api";
import { APPLY_LAYOUT, applyLayoutFailure, applyLayoutSuccess } from "../actions";
import type { ObsidianApplyLayoutReport } from "../types";

export function* applyLayoutSaga(): SagaIterator {
  const obsidianApi = apiFactory.createObsidianApi();
  try {
    const report: ObsidianApplyLayoutReport = yield call([
      obsidianApi,
      obsidianApi.applyLayout,
    ]);
    yield put(applyLayoutSuccess(report));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(applyLayoutFailure(message));
  }
}

export function* watchApplyLayout(): SagaIterator {
  yield takeLatest(APPLY_LAYOUT, applyLayoutSaga);
}
