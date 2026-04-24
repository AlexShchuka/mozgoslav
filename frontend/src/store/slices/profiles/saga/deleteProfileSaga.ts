import { call, put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { apiFactory } from "../../../../api";
import {
  DELETE_PROFILE,
  type DeleteProfileAction,
  deleteProfileFailure,
  deleteProfileSuccess,
} from "../actions";

export function* deleteProfileSaga(action: DeleteProfileAction): SagaIterator {
  const profilesApi = apiFactory.createProfilesApi();
  const { id } = action.payload;
  try {
    yield call([profilesApi, profilesApi.remove], id);
    yield put(deleteProfileSuccess(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(deleteProfileFailure(id, message));
  }
}

export function* watchDeleteProfile(): SagaIterator {
  yield takeEvery(DELETE_PROFILE, deleteProfileSaga);
}
