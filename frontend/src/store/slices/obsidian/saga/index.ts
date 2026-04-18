import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchApplyLayout } from "./applyLayoutSaga";
import { watchBulkExport } from "./bulkExportSaga";
import { watchSetupObsidian } from "./setupObsidianSaga";

export { applyLayoutSaga } from "./applyLayoutSaga";
export { bulkExportSaga } from "./bulkExportSaga";
export { setupObsidianSaga } from "./setupObsidianSaga";

export function* watchObsidianSagas(): SagaIterator {
  yield all([fork(watchSetupObsidian), fork(watchBulkExport), fork(watchApplyLayout)]);
}
