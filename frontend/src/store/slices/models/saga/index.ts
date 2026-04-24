import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchLoadModels } from "./loadModelsSaga";
import { watchDownloadModel } from "./downloadModelSaga";
import { watchSubscribeModelDownload } from "./subscribeModelDownloadSaga";

export { watchLoadModels } from "./loadModelsSaga";
export { watchDownloadModel } from "./downloadModelSaga";
export { watchSubscribeModelDownload } from "./subscribeModelDownloadSaga";

export function* watchModelsSagas(): SagaIterator {
  yield all([fork(watchLoadModels), fork(watchDownloadModel), fork(watchSubscribeModelDownload)]);
}
