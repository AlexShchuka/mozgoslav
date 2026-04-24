import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { MutationDeleteProfileMutation } from "../../../../api/gql/graphql";
import { MutationDeleteProfileDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  DELETE_PROFILE,
  type DeleteProfileAction,
  deleteProfileFailure,
  deleteProfileSuccess,
} from "../actions";

export function* deleteProfileSaga(action: DeleteProfileAction): SagaIterator {
  const { id } = action.payload;
  try {
    const result = (yield* gqlRequest(MutationDeleteProfileDocument, {
      id,
    })) as MutationDeleteProfileMutation;

    const hasErrors = result.deleteProfile.errors.length > 0;
    if (hasErrors) {
      const firstError = result.deleteProfile.errors[0];
      yield put(deleteProfileFailure(id, firstError.message));
    } else {
      yield put(deleteProfileSuccess(id));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(deleteProfileFailure(id, message));
  }
}

export function* watchDeleteProfile(): SagaIterator {
  yield takeEvery(DELETE_PROFILE, deleteProfileSaga);
}
