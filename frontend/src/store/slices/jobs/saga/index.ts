import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchCancelJob } from "./cancelJobSaga";
import { watchRetryRecording } from "./retryRecordingSaga";
import { watchSubscribeJobs } from "./subscribeJobsSaga";

export { subscribeJobsSaga } from "./subscribeJobsSaga";
export { cancelJobSaga } from "./cancelJobSaga";
export { retryRecordingSaga } from "./retryRecordingSaga";

export function* watchJobsSagas(): SagaIterator {
  yield all([fork(watchSubscribeJobs), fork(watchCancelJob), fork(watchRetryRecording)]);
}
