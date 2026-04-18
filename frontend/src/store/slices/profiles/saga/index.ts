import { all, fork } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { watchCreateProfile } from "./createProfileSaga";
import { watchDeleteProfile } from "./deleteProfileSaga";
import { watchDuplicateProfile } from "./duplicateProfileSaga";
import { watchLoadProfiles } from "./loadProfilesSaga";
import { watchUpdateProfile } from "./updateProfileSaga";

export { createProfileSaga } from "./createProfileSaga";
export { deleteProfileSaga } from "./deleteProfileSaga";
export { duplicateProfileSaga } from "./duplicateProfileSaga";
export { loadProfilesSaga } from "./loadProfilesSaga";
export { updateProfileSaga } from "./updateProfileSaga";

export function* watchProfilesSagas(): SagaIterator {
  yield all([
    fork(watchLoadProfiles),
    fork(watchCreateProfile),
    fork(watchUpdateProfile),
    fork(watchDeleteProfile),
    fork(watchDuplicateProfile),
  ]);
}
