import { all, fork, put } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { watchNotificationsSagas } from "./slices/notifications";
import { watchRecordingSagas } from "./slices/recording";
import { watchSyncSagas } from "./slices/sync";
import { watchRagSagas } from "./slices/rag";
import { watchProfilesSagas } from "./slices/profiles";
import { watchSettingsSagas } from "./slices/settings";
import { watchObsidianSagas } from "./slices/obsidian";
import { watchOnboardingSagas } from "./slices/onboarding";
import { subscribeJobs, watchJobsSagas } from "./slices/jobs";
import { watchDictationSagas } from "./slices/dictation";
import { subscribeAudioDevices, watchAudioDevicesSagas } from "./slices/audioDevices";
import { watchNotesSagas } from "./slices/notes";
import { watchModelsSagas } from "./slices/models";

function* bootstrapJobsSubscription(): SagaIterator {
  yield put(subscribeJobs());
}

function* bootstrapAudioDevicesSubscription(): SagaIterator {
  yield put(subscribeAudioDevices());
}

export function* rootSaga(): SagaIterator {
  yield all([
    fork(watchNotificationsSagas),
    fork(watchRecordingSagas),
    fork(watchSyncSagas),
    fork(watchRagSagas),
    fork(watchProfilesSagas),
    fork(watchSettingsSagas),
    fork(watchObsidianSagas),
    fork(watchOnboardingSagas),
    fork(watchJobsSagas),
    fork(bootstrapJobsSubscription),
    fork(watchDictationSagas),
    fork(watchAudioDevicesSagas),
    fork(bootstrapAudioDevicesSubscription),
    fork(watchNotesSagas),
    fork(watchModelsSagas),
  ]);
}
