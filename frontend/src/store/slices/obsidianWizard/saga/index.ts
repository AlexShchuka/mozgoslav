import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchWizardSaga } from "./wizardSaga";

export { wizardSaga } from "./wizardSaga";

export function* watchObsidianWizardSagas(): SagaIterator {
  yield all([fork(watchWizardSaga)]);
}
