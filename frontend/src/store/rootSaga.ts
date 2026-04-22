import {all, fork, put} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";
import {watchRecordingSagas} from "./slices/recording/sagas";
import {watchSyncSagas} from "./slices/sync/sagas";
import {watchRagSagas} from "./slices/rag/sagas";
import {watchProfilesSagas} from "./slices/profiles/sagas";
import {watchSettingsSagas} from "./slices/settings/sagas";
import {watchObsidianSagas} from "./slices/obsidian/sagas";
import {watchOnboardingSagas} from "./slices/onboarding/sagas";
import {subscribeJobs, watchJobsSagas} from "./slices/jobs/sagas";

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
