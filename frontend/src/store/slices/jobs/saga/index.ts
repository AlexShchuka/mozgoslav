import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchCancelJob } from "./cancelJobSaga";
import { watchPauseJob } from "./pauseJobSaga";
import { watchResumeJob } from "./resumeJobSaga";
import { watchRetryJobFromStage } from "./retryJobFromStageSaga";
import { watchRetryRecording } from "./retryRecordingSaga";
import { watchSubscribeJobs } from "./subscribeJobsSaga";

export { subscribeJobsSaga } from "./subscribeJobsSaga";
export { cancelJobSaga } from "./cancelJobSaga";
export { retryRecordingSaga } from "./retryRecordingSaga";
export { pauseJobSaga } from "./pauseJobSaga";
export { resumeJobSaga } from "./resumeJobSaga";
export { retryJobFromStageSaga } from "./retryJobFromStageSaga";

export function* watchJobsSagas(): SagaIterator {
  yield all([
    fork(watchSubscribeJobs),
    fork(watchCancelJob),
    fork(watchRetryRecording),
    fork(watchPauseJob),
    fork(watchResumeJob),
    fork(watchRetryJobFromStage),
  ]);
}
