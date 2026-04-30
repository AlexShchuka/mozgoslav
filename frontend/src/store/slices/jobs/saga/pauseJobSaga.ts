import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { MutationPauseJobDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  PAUSE_JOB_REQUESTED,
  pauseJobFailed,
  pauseJobSucceeded,
  type PauseJobRequestedAction,
} from "../actions";

export function* pauseJobSaga(action: PauseJobRequestedAction): SagaIterator {
  const { jobId } = action.payload;
  try {
    const result = (yield* gqlRequest(MutationPauseJobDocument, { id: jobId })) as {
      pauseJob: { errors: Array<{ code: string; message: string }> };
    };
    const errors = result.pauseJob.errors;
    if (errors.length > 0) {
      yield put(pauseJobFailed(jobId, errors[0].message));
      return;
    }
    yield put(pauseJobSucceeded(jobId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(pauseJobFailed(jobId, message));
  }
}

export function* watchPauseJob(): SagaIterator {
  yield takeEvery(PAUSE_JOB_REQUESTED, pauseJobSaga);
}
