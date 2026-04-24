import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { MutationSetupObsidianDocument } from "../../../../api/gql/graphql";
import type { MutationSetupObsidianMutation } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { notifyError, notifySuccess } from "../../notifications";
import { SETUP_OBSIDIAN, type SetupObsidianAction, setupObsidianDone } from "../actions";

export function* setupObsidianSaga(action: SetupObsidianAction): SagaIterator {
  try {
    const data = (yield* gqlRequest(MutationSetupObsidianDocument, {
      vaultPath: action.payload.vaultPath,
    })) as MutationSetupObsidianMutation;
    if (data.setupObsidian.errors.length > 0) {
      yield put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: data.setupObsidian.errors[0].message },
        })
      );
    } else if (data.setupObsidian.report) {
      yield put(
        notifySuccess({
          messageKey: "obsidian.setupSuccess",
          params: { created: data.setupObsidian.report.createdPaths.length },
        })
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(
      notifyError({
        messageKey: "errors.genericErrorWithMessage",
        params: { message },
      })
    );
  }
  yield put(setupObsidianDone());
}

export function* watchSetupObsidian(): SagaIterator {
  yield takeLatest(SETUP_OBSIDIAN, setupObsidianSaga);
}
