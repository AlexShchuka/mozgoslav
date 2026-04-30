import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import {
  JobStage as GqlJobStage,
  type MutationRetryJobFromStageMutation,
} from "../../../../api/gql/graphql";
import { MutationRetryJobFromStageDocument } from "../../../../api/gql/graphql";
import type { JobStage } from "../../../../domain";
import { gqlRequest } from "../../../saga/graphql";
import {
  RETRY_JOB_FROM_STAGE_REQUESTED,
  retryJobFromStageFailed,
  retryJobFromStageSucceeded,
  type RetryJobFromStageRequestedAction,
} from "../actions";
import { mapGqlJob } from "../jobMapper";

function domainStageToGql(stage: JobStage): GqlJobStage {
  const map: Record<JobStage, GqlJobStage> = {
    Transcribing: GqlJobStage.Transcribing,
    Correcting: GqlJobStage.Correcting,
    LlmCorrection: GqlJobStage.LlmCorrection,
    Summarizing: GqlJobStage.Summarizing,
    Exporting: GqlJobStage.Exporting,
  };
  return map[stage];
}

export function* retryJobFromStageSaga(action: RetryJobFromStageRequestedAction): SagaIterator {
  const { jobId, fromStage, skipFailed } = action.payload;
  try {
    const result = (yield* gqlRequest(MutationRetryJobFromStageDocument, {
      input: {
        jobId,
        fromStage: domainStageToGql(fromStage),
        skipFailed,
      },
    })) as MutationRetryJobFromStageMutation;
    const errors = result.retryJobFromStage.errors;
    if (errors.length > 0) {
      yield put(retryJobFromStageFailed(jobId, errors[0].message));
      return;
    }
    if (result.retryJobFromStage.job) {
      yield put(retryJobFromStageSucceeded(mapGqlJob(result.retryJobFromStage.job)));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(retryJobFromStageFailed(jobId, message));
  }
}

export function* watchRetryJobFromStage(): SagaIterator {
  yield takeEvery(RETRY_JOB_FROM_STAGE_REQUESTED, retryJobFromStageSaga);
}
