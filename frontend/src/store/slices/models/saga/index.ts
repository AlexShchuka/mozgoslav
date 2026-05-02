import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchLoadModels } from "./loadModelsSaga";
import { watchLoadActiveDownloads } from "./loadActiveDownloadsSaga";
import { watchDownloadModel } from "./downloadModelSaga";
import { watchCancelModelDownload } from "./cancelModelDownloadSaga";
import { watchSubscribeModelDownload } from "./subscribeModelDownloadSaga";

export { watchLoadModels } from "./loadModelsSaga";
export { watchLoadActiveDownloads } from "./loadActiveDownloadsSaga";
export { watchDownloadModel } from "./downloadModelSaga";
export { watchCancelModelDownload } from "./cancelModelDownloadSaga";
export { watchSubscribeModelDownload } from "./subscribeModelDownloadSaga";

export function* watchModelsSagas(): SagaIterator {
  yield all([
    fork(watchLoadModels),
    fork(watchLoadActiveDownloads),
    fork(watchDownloadModel),
    fork(watchCancelModelDownload),
    fork(watchSubscribeModelDownload),
  ]);
}
