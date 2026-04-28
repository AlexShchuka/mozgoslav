import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchLoadSystemActionTemplates } from "./loadSystemActionTemplatesSaga";

export function* systemActionsSaga(): SagaIterator {
  yield all([fork(watchLoadSystemActionTemplates)]);
}
