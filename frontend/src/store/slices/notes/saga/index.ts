import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { watchLoadNotes } from "./loadNotesSaga";
import { watchLoadNote } from "./loadNoteSaga";
import { watchDeleteNote } from "./deleteNoteSaga";
import { watchCreateNote } from "./createNoteSaga";
import { watchExportNote } from "./exportNoteSaga";

export function* watchNotesSagas(): SagaIterator {
  yield all([
    fork(watchLoadNotes),
    fork(watchLoadNote),
    fork(watchDeleteNote),
    fork(watchCreateNote),
    fork(watchExportNote),
  ]);
}
