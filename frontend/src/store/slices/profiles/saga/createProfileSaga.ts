import { call, put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { apiFactory } from "../../../../api";
import type { Profile } from "../../../../domain/Profile";
import {
  CREATE_PROFILE,
  createProfileFailure,
  createProfileSuccess,
  type CreateProfileAction,
} from "../actions";

export function* createProfileSaga(action: CreateProfileAction): SagaIterator {
  const profilesApi = apiFactory.createProfilesApi();
  try {
    const created: Profile = yield call([profilesApi, profilesApi.create], action.payload);
    yield put(createProfileSuccess(created));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(createProfileFailure(message));
  }
}

export function* watchCreateProfile(): SagaIterator {
  yield takeEvery(CREATE_PROFILE, createProfileSaga);
}
