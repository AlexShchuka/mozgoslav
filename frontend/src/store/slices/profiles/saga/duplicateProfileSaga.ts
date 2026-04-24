import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { MutationDuplicateProfileMutation } from "../../../../api/gql/graphql";
import { MutationDuplicateProfileDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  DUPLICATE_PROFILE,
  type DuplicateProfileAction,
  duplicateProfileFailure,
  duplicateProfileSuccess,
} from "../actions";
import { mapGqlProfile } from "./profileMapper";

export function* duplicateProfileSaga(action: DuplicateProfileAction): SagaIterator {
  const { id } = action.payload;
  try {
    const result = (yield* gqlRequest(MutationDuplicateProfileDocument, {
      id,
    })) as MutationDuplicateProfileMutation;

    const dto = result.duplicateProfile.profile;
    if (dto) {
      yield put(duplicateProfileSuccess(mapGqlProfile(dto)));
    } else {
      const firstError = result.duplicateProfile.errors[0];
      yield put(duplicateProfileFailure(id, firstError?.message ?? "Duplicate failed"));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(duplicateProfileFailure(id, message));
  }
}

export function* watchDuplicateProfile(): SagaIterator {
  yield takeEvery(DUPLICATE_PROFILE, duplicateProfileSaga);
}
