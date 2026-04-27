import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import {
  MutationObsidianReapplyBootstrapDocument,
  type MutationObsidianReapplyBootstrapMutation,
} from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { notifyError, notifySuccess } from "../../notifications";
import { REAPPLY_BOOTSTRAP, fetchDiagnostics, reapplyBootstrapDone } from "../actions";

export function* reapplyBootstrapSaga(): SagaIterator {
  try {
    const data = (yield* gqlRequest(
      MutationObsidianReapplyBootstrapDocument,
      {}
    )) as MutationObsidianReapplyBootstrapMutation;
    const payload = data.obsidianReapplyBootstrap;
    if (payload.errors.length > 0) {
      yield put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: payload.errors[0].message },
        })
      );
    } else {
      yield put(notifySuccess({ messageKey: "obsidian.diagnostics.reapplyBootstrapSuccess" }));
      yield put(fetchDiagnostics());
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message } }));
  }
  yield put(reapplyBootstrapDone());
}

export function* watchReapplyBootstrap(): SagaIterator {
  yield takeLatest(REAPPLY_BOOTSTRAP, reapplyBootstrapSaga);
}
