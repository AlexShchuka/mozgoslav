import { call, put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { apiFactory } from "../../../../api";
import type { Profile } from "../../../../domain/Profile";
import {
  UPDATE_PROFILE,
  type UpdateProfileAction,
  updateProfileFailure,
  updateProfileSuccess,
} from "../actions";

export function* updateProfileSaga(action: UpdateProfileAction): SagaIterator {
  const profilesApi = apiFactory.createProfilesApi();
  try {
    const updated: Profile = yield call(
      [profilesApi, profilesApi.update],
      action.payload.id,
      action.payload.draft
    );
    yield put(updateProfileSuccess(updated));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(updateProfileFailure(message));
  }
}

export function* watchUpdateProfile(): SagaIterator {
  yield takeEvery(UPDATE_PROFILE, updateProfileSaga);
}
