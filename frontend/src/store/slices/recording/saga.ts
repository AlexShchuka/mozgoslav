import { put, takeEvery, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QueryRecordingsQuery } from "../../../api/gql/graphql";
import {
  MutationDeleteRecordingDocument,
  MutationImportRecordingsDocument,
  MutationUploadRecordingsDocument,
  QueryRecordingsDocument,
} from "../../../api/gql/graphql";
import { gqlRequest } from "../../saga/graphql";
import {
  DELETE_RECORDING,
  IMPORT_RECORDINGS_REQUESTED,
  LOAD_RECORDINGS,
  UPLOAD_RECORDINGS_REQUESTED,
  deleteRecordingFailure,
  deleteRecordingSuccess,
  importRecordingsFailure,
  importRecordingsSuccess,
  loadRecordings,
  loadRecordingsFailure,
  loadRecordingsSuccess,
  loadRecordingsUnavailable,
  uploadRecordingsFailure,
  uploadRecordingsSuccess,
  type DeleteRecordingAction,
  type ImportRecordingsRequestedAction,
  type UploadRecordingsRequestedAction,
} from "./actions";
import { mapGqlRecording } from "./recordingMapper";

export function* loadRecordingsSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryRecordingsDocument, {
      first: 200,
    })) as QueryRecordingsQuery;
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

export function* deleteRecordingSaga(action: DeleteRecordingAction): SagaIterator {
  const id = action.payload;
  try {
    yield* gqlRequest(MutationDeleteRecordingDocument, { id });
    yield put(deleteRecordingSuccess(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(deleteRecordingFailure({ id, error: message }));
  }
}

export function* uploadRecordingsSaga(action: UploadRecordingsRequestedAction): SagaIterator {
  const { filePaths } = action.payload;
  try {
    yield* gqlRequest(MutationUploadRecordingsDocument, { input: { filePaths } });
    yield put(uploadRecordingsSuccess({ count: filePaths.length }));
    yield put(loadRecordings());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(uploadRecordingsFailure({ error: message }));
  }
}

export function* importRecordingsSaga(action: ImportRecordingsRequestedAction): SagaIterator {
  const { filePaths } = action.payload;
  try {
    yield* gqlRequest(MutationImportRecordingsDocument, { input: { filePaths } });
    yield put(importRecordingsSuccess({ count: filePaths.length }));
    yield put(loadRecordings());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(importRecordingsFailure({ error: message }));
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
  yield takeEvery(DELETE_RECORDING, deleteRecordingSaga);
  yield takeEvery(UPLOAD_RECORDINGS_REQUESTED, uploadRecordingsSaga);
  yield takeEvery(IMPORT_RECORDINGS_REQUESTED, importRecordingsSaga);
}
