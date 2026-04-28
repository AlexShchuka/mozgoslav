import { all, fork, put } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { watchNotificationsSagas } from "./slices/notifications";
import { watchRecordingSagas } from "./slices/recording";
import { watchSyncSagas } from "./slices/sync";
import { watchRagSagas } from "./slices/rag";
import { watchProfilesSagas } from "./slices/profiles";
import { watchSettingsSagas } from "./slices/settings";
import { watchObsidianSagas } from "./slices/obsidian";
import { watchObsidianWizardSagas } from "./slices/obsidianWizard";
import { watchOnboardingSagas } from "./slices/onboarding";
import { subscribeJobs, watchJobsSagas } from "./slices/jobs";
import { watchDictationSagas } from "./slices/dictation";
import { subscribeAudioDevices, watchAudioDevicesSagas } from "./slices/audioDevices";
import { watchNotesSagas } from "./slices/notes";
import { watchModelsSagas } from "./slices/models";
import { watchBackupsSagas } from "./slices/backups";
import { subscribeHotkeys, watchHotkeysSagas } from "./slices/hotkeys";
import { healthProbeRequested, watchHealthSagas } from "./slices/health";
import { watchAskSagas } from "./slices/ask/saga";

function* bootstrapJobsSubscription(): SagaIterator {
  yield put(subscribeJobs());
}

function* bootstrapAudioDevicesSubscription(): SagaIterator {
  yield put(subscribeAudioDevices());
}

function* bootstrapHotkeysSubscription(): SagaIterator {
  yield put(subscribeHotkeys());
}

function* bootstrapHealthProbe(): SagaIterator {
  yield put(healthProbeRequested());
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
    fork(watchObsidianWizardSagas),
    fork(watchOnboardingSagas),
    fork(watchJobsSagas),
    fork(bootstrapJobsSubscription),
    fork(watchDictationSagas),
    fork(watchAudioDevicesSagas),
    fork(bootstrapAudioDevicesSubscription),
    fork(watchNotesSagas),
    fork(watchModelsSagas),
    fork(watchBackupsSagas),
    fork(watchHotkeysSagas),
    fork(bootstrapHotkeysSubscription),
    fork(watchHealthSagas),
    fork(bootstrapHealthProbe),
    fork(watchAskSagas),
  ]);
}
