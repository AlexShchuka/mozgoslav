import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QueryBackupsQuery } from "../../../../api/gql/graphql";
import { QueryBackupsDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { LOAD_BACKUPS, loadBackupsFailure, loadBackupsSuccess } from "../actions";

export function* loadBackupsSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryBackupsDocument, {})) as QueryBackupsQuery;
    yield put(
      loadBackupsSuccess(
        result.backups.map((b) => ({
          name: b.name,
          path: b.path,
          sizeBytes: Number(b.sizeBytes),
          createdAt: b.createdAt,
        }))
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(loadBackupsFailure(message));
  }
}

export function* watchLoadBackups(): SagaIterator {
  yield takeLatest(LOAD_BACKUPS, loadBackupsSaga);
}
