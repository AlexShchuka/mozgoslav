import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { MutationUpdateProfileMutation } from "../../../../api/gql/graphql";
import { MutationUpdateProfileDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  UPDATE_PROFILE,
  type UpdateProfileAction,
  updateProfileFailure,
  updateProfileSuccess,
} from "../actions";
import { mapDomainProfileToInput, mapGqlProfile } from "./profileMapper";

export function* updateProfileSaga(action: UpdateProfileAction): SagaIterator {
  try {
    const result = (yield* gqlRequest(MutationUpdateProfileDocument, {
      id: action.payload.id,
      input: mapDomainProfileToInput(action.payload.draft),
    })) as MutationUpdateProfileMutation;

    const dto = result.updateProfile.profile;
    if (dto) {
      yield put(updateProfileSuccess(mapGqlProfile(dto)));
    } else {
      const firstError = result.updateProfile.errors[0];
      yield put(updateProfileFailure(firstError?.message ?? "Update failed"));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(updateProfileFailure(message));
  }
}

export function* watchUpdateProfile(): SagaIterator {
  yield takeEvery(UPDATE_PROFILE, updateProfileSaga);
}
