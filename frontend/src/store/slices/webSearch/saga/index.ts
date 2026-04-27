import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchLoadWebSearchConfig } from "./loadWebSearchConfigSaga";
import { watchSaveWebSearchConfig } from "./saveWebSearchConfigSaga";

export function* webSearchSaga(): SagaIterator {
  yield all([fork(watchLoadWebSearchConfig), fork(watchSaveWebSearchConfig)]);
}
