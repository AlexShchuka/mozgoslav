import {all, fork, put} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";
import {watchRecordingSagas} from "./slices/recording";
import {watchSyncSagas} from "./slices/sync";
import {watchRagSagas} from "./slices/rag";
import {watchProfilesSagas} from "./slices/profiles";
import {watchSettingsSagas} from "./slices/settings";
import {watchObsidianSagas} from "./slices/obsidian";
import {watchOnboardingSagas} from "./slices/onboarding";
import {subscribeJobs, watchJobsSagas} from "./slices/jobs";

function* bootstrapJobsSubscription(): SagaIterator {
    yield put(subscribeJobs());
}

export function* rootSaga(): SagaIterator {
    yield all([
        fork(watchRecordingSagas),
        fork(watchSyncSagas),
        fork(watchRagSagas),
        fork(watchProfilesSagas),
        fork(watchSettingsSagas),
        fork(watchObsidianSagas),
        fork(watchOnboardingSagas),
        fork(watchJobsSagas),
        fork(bootstrapJobsSubscription),
    ]);
}
