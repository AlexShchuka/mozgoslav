import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { MutationDeleteNoteDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { notifyError, notifySuccess } from "../../notifications";
import {
  DELETE_NOTE,
  deleteNoteFailure,
  deleteNoteSuccess,
  type DeleteNoteAction,
} from "../actions";

function* deleteNoteSaga(action: DeleteNoteAction): SagaIterator {
  const id = action.payload;
  try {
    yield* gqlRequest(MutationDeleteNoteDocument, { id });
    yield put(deleteNoteSuccess(id));
    yield put(notifySuccess({ messageKey: "notes.deleted" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(deleteNoteFailure({ id, error: message }));
    yield put(notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message } }));
  }
}

export function* watchDeleteNote(): SagaIterator {
  yield takeEvery(DELETE_NOTE, deleteNoteSaga);
}
