import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QueryProfilesQuery } from "../../../../api/gql/graphql";
import { QueryProfilesDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { LOAD_PROFILES, loadProfilesFailure, loadProfilesSuccess } from "../actions";
import { mapGqlProfile } from "./profileMapper";

export function* loadProfilesSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryProfilesDocument, {})) as QueryProfilesQuery;
    yield put(loadProfilesSuccess(result.profiles.map(mapGqlProfile)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(loadProfilesFailure(message));
  }
}

export function* watchLoadProfiles(): SagaIterator {
  yield takeLatest(LOAD_PROFILES, loadProfilesSaga);
}
