import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchPersistCompletion } from "./persistCompletionSaga";

export { persistCompletionSaga } from "./persistCompletionSaga";

export function* watchOnboardingSagas(): SagaIterator {
  yield all([fork(watchPersistCompletion)]);
}
