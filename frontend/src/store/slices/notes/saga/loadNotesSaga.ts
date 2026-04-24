import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { QueryNotesQuery } from "../../../../api/gql/graphql";
import { QueryNotesDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import type { ProcessedNote } from "../../../../domain/ProcessedNote";
import { LOAD_NOTES, loadNotesFailure, loadNotesSuccess } from "../actions";

function* loadNotesSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryNotesDocument, { first: 200 })) as QueryNotesQuery;
    const nodes = result.notes?.nodes ?? [];
    const notes = nodes as unknown as ProcessedNote[];
    yield put(loadNotesSuccess(notes));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(loadNotesFailure(message));
  }
}

export function* watchLoadNotes(): SagaIterator {
  yield takeLatest(LOAD_NOTES, loadNotesSaga);
}
