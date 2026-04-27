import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import {
  MutationObsidianRunDiagnosticsDocument,
  type MutationObsidianRunDiagnosticsMutation,
} from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { FETCH_DIAGNOSTICS, fetchDiagnosticsDone, fetchDiagnosticsFailed } from "../actions";
import { mapGqlDiagnostics } from "../diagnosticsMapper";

export function* diagnosticsSaga(): SagaIterator {
  try {
    const data = (yield* gqlRequest(
      MutationObsidianRunDiagnosticsDocument,
      {}
    )) as MutationObsidianRunDiagnosticsMutation;
    const payload = data.obsidianRunDiagnostics;
    if (payload.errors.length > 0) {
      yield put(fetchDiagnosticsFailed(payload.errors[0].message));
      return;
    }
    if (!payload.report) {
      yield put(fetchDiagnosticsFailed("empty diagnostics payload"));
      return;
    }
    yield put(fetchDiagnosticsDone(mapGqlDiagnostics(payload.report)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(fetchDiagnosticsFailed(message));
  }
}

export function* watchFetchDiagnostics(): SagaIterator {
  yield takeLatest(FETCH_DIAGNOSTICS, diagnosticsSaga);
}
