import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { QueryHealthDocument, type QueryHealthQuery } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { HEALTH_PROBE_REQUESTED, healthProbeResult } from "../actions";

export function* healthProbeSaga(): SagaIterator {
  const now = new Date().toISOString();
  try {
    const data = (yield* gqlRequest(QueryHealthDocument, {})) as QueryHealthQuery;
    const status = data.health?.status === "ok" ? "ok" : "down";
    yield put(healthProbeResult(status, now));
  } catch {
    yield put(healthProbeResult("down", now));
  }
}

export function* watchHealthSaga(): SagaIterator {
  yield takeEvery(HEALTH_PROBE_REQUESTED, healthProbeSaga);
}
