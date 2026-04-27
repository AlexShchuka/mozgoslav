import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchFetchDiagnostics } from "./diagnosticsSaga";
import { watchReapplyBootstrap } from "./reapplyBootstrapSaga";
import { watchReinstallPlugins } from "./reinstallPluginsSaga";
import { watchSetupObsidian } from "./setupObsidianSaga";

export { diagnosticsSaga } from "./diagnosticsSaga";
export { reapplyBootstrapSaga } from "./reapplyBootstrapSaga";
export { reinstallPluginsSaga } from "./reinstallPluginsSaga";
export { setupObsidianSaga } from "./setupObsidianSaga";

export function* watchObsidianSagas(): SagaIterator {
  yield all([
    fork(watchSetupObsidian),
    fork(watchFetchDiagnostics),
    fork(watchReapplyBootstrap),
    fork(watchReinstallPlugins),
  ]);
}
