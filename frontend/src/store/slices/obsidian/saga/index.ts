import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchApplyLayout } from "./applyLayoutSaga";
import { watchBulkExport } from "./bulkExportSaga";
import { watchFetchDiagnostics } from "./diagnosticsSaga";
import { watchReapplyBootstrap } from "./reapplyBootstrapSaga";
import { watchReinstallPlugins } from "./reinstallPluginsSaga";
import { watchSetupObsidian } from "./setupObsidianSaga";

export { applyLayoutSaga } from "./applyLayoutSaga";
export { bulkExportSaga } from "./bulkExportSaga";
export { diagnosticsSaga } from "./diagnosticsSaga";
export { reapplyBootstrapSaga } from "./reapplyBootstrapSaga";
export { reinstallPluginsSaga } from "./reinstallPluginsSaga";
export { setupObsidianSaga } from "./setupObsidianSaga";

export function* watchObsidianSagas(): SagaIterator {
  yield all([
    fork(watchSetupObsidian),
    fork(watchBulkExport),
    fork(watchApplyLayout),
    fork(watchFetchDiagnostics),
    fork(watchReapplyBootstrap),
    fork(watchReinstallPlugins),
  ]);
}
