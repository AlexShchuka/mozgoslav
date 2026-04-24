import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchCreateBackup } from "./createBackupSaga";
import { watchLoadBackups } from "./loadBackupsSaga";

export { createBackupSaga } from "./createBackupSaga";
export { loadBackupsSaga } from "./loadBackupsSaga";

export function* watchBackupsSagas(): SagaIterator {
  yield all([fork(watchLoadBackups), fork(watchCreateBackup)]);
}
