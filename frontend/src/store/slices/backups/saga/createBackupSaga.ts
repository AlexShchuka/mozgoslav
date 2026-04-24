import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { MutationCreateBackupMutation } from "../../../../api/gql/graphql";
import { MutationCreateBackupDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { notifyError, notifySuccess } from "../../notifications";
import { CREATE_BACKUP, createBackupFailure, createBackupSuccess, loadBackups } from "../actions";

export function* createBackupSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(
      MutationCreateBackupDocument,
      {}
    )) as MutationCreateBackupMutation;

    const errors = result.createBackup.errors;
    if (errors.length > 0) {
      const firstMsg = errors[0]!.message;
      yield put(createBackupFailure(firstMsg));
      yield put(
        notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message: firstMsg } })
      );
      return;
    }

    const dto = result.createBackup.backup;
    if (dto) {
      yield put(
        createBackupSuccess({
          name: dto.name,
          path: dto.path,
          sizeBytes: Number(dto.sizeBytes),
          createdAt: dto.createdAt,
        })
      );
    } else {
      yield put(createBackupSuccess({ name: "", path: "", sizeBytes: 0, createdAt: "" }));
    }

    yield put(notifySuccess({ messageKey: "backup.successToast" }));
    yield put(loadBackups());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(createBackupFailure(message));
    yield put(notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message } }));
  }
}

export function* watchCreateBackup(): SagaIterator {
  yield takeEvery(CREATE_BACKUP, createBackupSaga);
}
