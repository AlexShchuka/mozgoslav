import { takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { MutationReprocessRecordingDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { RETRY_RECORDING, type RetryRecordingAction } from "../actions";

export function* retryRecordingSaga(action: RetryRecordingAction): SagaIterator {
  try {
    yield* gqlRequest(MutationReprocessRecordingDocument, {
      recordingId: action.payload.recordingId,
      profileId: action.payload.profileId,
    });
  } catch {}
}

export function* watchRetryRecording(): SagaIterator {
  yield takeEvery(RETRY_RECORDING, retryRecordingSaga);
}
