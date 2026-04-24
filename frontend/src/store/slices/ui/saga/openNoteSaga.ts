import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QueryRecordingWithNotesQuery } from "../../../../api/gql/graphql";
import { QueryRecordingWithNotesDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  OPEN_NOTE_REQUESTED,
  openNoteFailed,
  openNoteResolved,
  type OpenNoteRequestedAction,
} from "../actions";

export function* openNoteSaga(action: OpenNoteRequestedAction): SagaIterator {
  const recordingId = action.payload;
  try {
    const result = (yield* gqlRequest(QueryRecordingWithNotesDocument, {
      id: recordingId,
    })) as QueryRecordingWithNotesQuery;
    const firstNoteId = result.recording?.notes[0]?.id ?? null;
    yield put(openNoteResolved(recordingId, firstNoteId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(openNoteFailed(recordingId, message));
  }
}

export function* watchOpenNoteSagas(): SagaIterator {
  yield takeEvery(OPEN_NOTE_REQUESTED, openNoteSaga);
}
