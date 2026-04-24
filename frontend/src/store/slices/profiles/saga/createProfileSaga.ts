import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { MutationCreateProfileMutation } from "../../../../api/gql/graphql";
import { MutationCreateProfileDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  CREATE_PROFILE,
  type CreateProfileAction,
  createProfileFailure,
  createProfileSuccess,
} from "../actions";
import { mapDomainProfileToInput, mapGqlProfile } from "./profileMapper";

export function* createProfileSaga(action: CreateProfileAction): SagaIterator {
  try {
    const result = (yield* gqlRequest(MutationCreateProfileDocument, {
      input: mapDomainProfileToInput(action.payload),
    })) as MutationCreateProfileMutation;

    const dto = result.createProfile.profile;
    if (dto) {
      yield put(createProfileSuccess(mapGqlProfile(dto)));
    } else {
      const firstError = result.createProfile.errors[0];
      yield put(createProfileFailure(firstError?.message ?? "Create failed"));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(createProfileFailure(message));
  }
}

export function* watchCreateProfile(): SagaIterator {
  yield takeEvery(CREATE_PROFILE, createProfileSaga);
}
