import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QueryRecordingsQuery } from "../../../api/gql/graphql";
import { QueryRecordingsDocument } from "../../../api/gql/graphql";
import { gqlRequest } from "../../saga/graphql";
import {
  LOAD_RECORDINGS,
  loadRecordingsFailure,
  loadRecordingsSuccess,
  loadRecordingsUnavailable,
} from "./actions";
import { mapGqlRecording } from "./recordingMapper";

export function* loadRecordingsSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryRecordingsDocument, { first: 200 })) as QueryRecordingsQuery;
    const nodes = result.recordings?.nodes ?? [];
    const recordings = nodes.map(mapGqlRecording);
    yield put(loadRecordingsSuccess(recordings));
  } catch (error) {
    if (isBackendDown(error)) {
      yield put(loadRecordingsUnavailable());
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(loadRecordingsFailure(message));
  }
}

const isBackendDown = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND") ||
      error.message.includes("fetch failed") ||
      error.message.includes("Failed to fetch")
    );
  }
  return false;
};

export function* watchRecordingSagas(): SagaIterator {
  yield takeLatest(LOAD_RECORDINGS, loadRecordingsSaga);
}
