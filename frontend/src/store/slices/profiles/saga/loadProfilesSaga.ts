import {call, put, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import type {Profile} from "../../../../domain/Profile";
import {LOAD_PROFILES, loadProfilesFailure, loadProfilesSuccess,} from "../actions";

export function* loadProfilesSaga(): SagaIterator {
    const profilesApi = apiFactory.createProfilesApi();
    try {
        const profiles: Profile[] = yield call([profilesApi, profilesApi.list]);
        yield put(loadProfilesSuccess(profiles));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield put(loadProfilesFailure(message));
    }
}

export function* watchLoadProfiles(): SagaIterator {
    yield takeLatest(LOAD_PROFILES, loadProfilesSaga);
}
