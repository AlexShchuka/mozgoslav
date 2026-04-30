import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchCheckLlm } from "./checkLlmSaga";
import { watchLoadLlmCapabilities } from "./loadLlmCapabilitiesSaga";
import { watchLoadLlmModels } from "./loadLlmModelsSaga";
import { watchLoadSettings } from "./loadSettingsSaga";
import { watchSaveSettings } from "./saveSettingsSaga";

export { checkLlmSaga } from "./checkLlmSaga";
export { loadLlmCapabilitiesSaga } from "./loadLlmCapabilitiesSaga";
export { loadLlmModelsSaga } from "./loadLlmModelsSaga";
export { loadSettingsSaga } from "./loadSettingsSaga";
export { saveSettingsSaga } from "./saveSettingsSaga";

export function* watchSettingsSagas(): SagaIterator {
  yield all([
    fork(watchLoadSettings),
    fork(watchSaveSettings),
    fork(watchCheckLlm),
    fork(watchLoadLlmCapabilities),
    fork(watchLoadLlmModels),
  ]);
}
