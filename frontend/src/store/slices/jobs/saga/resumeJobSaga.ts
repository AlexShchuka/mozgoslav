import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { MutationResumeJobMutation } from "../../../../api/gql/graphql";
import { MutationResumeJobDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  RESUME_JOB_REQUESTED,
  resumeJobFailed,
  resumeJobSucceeded,
  type ResumeJobRequestedAction,
} from "../actions";
import { mapGqlJob } from "../jobMapper";

export function* resumeJobSaga(action: ResumeJobRequestedAction): SagaIterator {
  const { jobId } = action.payload;
  try {
    const result = (yield* gqlRequest(MutationResumeJobDocument, {
      id: jobId,
    })) as MutationResumeJobMutation;
    const errors = result.resumeJob.errors;
    if (errors.length > 0) {
      yield put(resumeJobFailed(jobId, errors[0].message));
      return;
    }
    if (result.resumeJob.job) {
      yield put(resumeJobSucceeded(mapGqlJob(result.resumeJob.job)));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(resumeJobFailed(jobId, message));
  }
}

export function* watchResumeJob(): SagaIterator {
  yield takeEvery(RESUME_JOB_REQUESTED, resumeJobSaga);
}
