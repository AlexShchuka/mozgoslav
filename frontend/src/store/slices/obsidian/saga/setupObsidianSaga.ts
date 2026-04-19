import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import {SETUP_OBSIDIAN, type SetupObsidianAction, setupObsidianFailure, setupObsidianSuccess,} from "../actions";
import type {ObsidianSetupReport} from "../types";

export function* setupObsidianSaga(action: SetupObsidianAction): SagaIterator {
    const obsidianApi = apiFactory.createObsidianApi();
    try {
        const report: ObsidianSetupReport = yield call(
            [obsidianApi, obsidianApi.setup],
            action.payload.vaultPath,
        );
        yield put(setupObsidianSuccess(report));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield put(setupObsidianFailure(message));
    }
}

export function* watchSetupObsidian(): SagaIterator {
    yield takeLatest(SETUP_OBSIDIAN, setupObsidianSaga);
}
