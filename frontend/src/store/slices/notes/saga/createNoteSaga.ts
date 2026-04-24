import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { MutationCreateNoteMutation } from "../../../../api/gql/graphql";
import { MutationCreateNoteDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import type { ProcessedNote } from "../../../../domain/ProcessedNote";
import { notifyError, notifySuccess } from "../../notifications";
import {
  CREATE_NOTE,
  createNoteFailure,
  createNoteSuccess,
  type CreateNoteAction,
} from "../actions";

function* createNoteSaga(action: CreateNoteAction): SagaIterator {
  const { title, body } = action.payload;
  try {
    const result = (yield* gqlRequest(MutationCreateNoteDocument, {
      input: { title, body },
    })) as MutationCreateNoteMutation;
    const note = result.createNote.note as unknown as ProcessedNote;
    yield put(createNoteSuccess(note));
    yield put(notifySuccess({ messageKey: "notes.created" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(createNoteFailure(message));
    yield put(notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message } }));
  }
}

export function* watchCreateNote(): SagaIterator {
  yield takeEvery(CREATE_NOTE, createNoteSaga);
}
