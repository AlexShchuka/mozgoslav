import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchAskQuestion } from "./askQuestionSaga";
import { watchLoadRagStatus } from "./loadRagStatusSaga";
import { watchReindexRag } from "./reindexRagSaga";

export { askQuestionSaga, newId } from "./askQuestionSaga";
export { loadRagStatusSaga } from "./loadRagStatusSaga";
export { reindexRagSaga } from "./reindexRagSaga";

export function* watchRagSagas(): SagaIterator {
  yield all([fork(watchAskQuestion), fork(watchLoadRagStatus), fork(watchReindexRag)]);
}
