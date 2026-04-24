import { takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { MutationCancelJobDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { CANCEL_JOB, type CancelJobAction } from "../actions";

export function* cancelJobSaga(action: CancelJobAction): SagaIterator {
  try {
    yield* gqlRequest(MutationCancelJobDocument, { id: action.payload.jobId });
  } catch {}
}

export function* watchCancelJob(): SagaIterator {
  yield takeEvery(CANCEL_JOB, cancelJobSaga);
}
