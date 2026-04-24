import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { MutationExportNoteMutation } from "../../../../api/gql/graphql";
import { MutationExportNoteDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import type { ProcessedNote } from "../../../../domain/ProcessedNote";
import { notifyError, notifySuccess } from "../../notifications";
import {
  EXPORT_NOTE,
  exportNoteFailure,
  exportNoteSuccess,
  type ExportNoteAction,
} from "../actions";

function* exportNoteSaga(action: ExportNoteAction): SagaIterator {
  const id = action.payload;
  try {
    const result = (yield* gqlRequest(MutationExportNoteDocument, {
      id,
    })) as MutationExportNoteMutation;
    const note = result.exportNote.note as unknown as ProcessedNote;
    yield put(exportNoteSuccess(note));
    yield put(notifySuccess({ messageKey: "common.apply" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(exportNoteFailure({ id, error: message }));
    yield put(notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message } }));
  }
}

export function* watchExportNote(): SagaIterator {
  yield takeEvery(EXPORT_NOTE, exportNoteSaga);
}
