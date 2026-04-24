import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { QueryNoteQuery } from "../../../../api/gql/graphql";
import { QueryNoteDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import type { ProcessedNote } from "../../../../domain/ProcessedNote";
import { LOAD_NOTE, loadNoteFailure, loadNoteSuccess, type LoadNoteAction } from "../actions";

function* loadNoteSaga(action: LoadNoteAction): SagaIterator {
  const id = action.payload;
  try {
    const result = (yield* gqlRequest(QueryNoteDocument, { id })) as QueryNoteQuery;
    const note = result.note as ProcessedNote | null;
    if (!note) {
      yield put(loadNoteFailure({ id, error: "not found" }));
      return;
    }
    yield put(loadNoteSuccess(note));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(loadNoteFailure({ id, error: message }));
  }
}

export function* watchLoadNote(): SagaIterator {
  yield takeEvery(LOAD_NOTE, loadNoteSaga);
}
