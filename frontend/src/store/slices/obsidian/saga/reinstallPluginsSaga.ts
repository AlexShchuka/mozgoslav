import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import {
  MutationObsidianReinstallPluginsDocument,
  type MutationObsidianReinstallPluginsMutation,
} from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { notifyError, notifySuccess } from "../../notifications";
import { REINSTALL_PLUGINS, fetchDiagnostics, reinstallPluginsDone } from "../actions";

export function* reinstallPluginsSaga(): SagaIterator {
  try {
    const data = (yield* gqlRequest(
      MutationObsidianReinstallPluginsDocument,
      {}
    )) as MutationObsidianReinstallPluginsMutation;
    const payload = data.obsidianReinstallPlugins;
    if (payload.errors.length > 0) {
      yield put(
        notifyError({
          messageKey: "errors.genericErrorWithMessage",
          params: { message: payload.errors[0].message },
        })
      );
    } else {
      yield put(
        notifySuccess({
          messageKey: "obsidian.diagnostics.reinstallPluginsSuccess",
          params: { count: payload.reinstalled.length },
        })
      );
      yield put(fetchDiagnostics());
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message } }));
  }
  yield put(reinstallPluginsDone());
}

export function* watchReinstallPlugins(): SagaIterator {
  yield takeLatest(REINSTALL_PLUGINS, reinstallPluginsSaga);
}
