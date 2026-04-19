import {call, put, takeEvery} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import type {Profile} from "../../../../domain/Profile";
import {
    DUPLICATE_PROFILE,
    type DuplicateProfileAction,
    duplicateProfileFailure,
    duplicateProfileSuccess,
} from "../actions";

export function* duplicateProfileSaga(action: DuplicateProfileAction): SagaIterator {
    const profilesApi = apiFactory.createProfilesApi();
    const {id} = action.payload;
    try {
        const copy: Profile = yield call([profilesApi, profilesApi.duplicate], id);
        yield put(duplicateProfileSuccess(copy));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        yield put(duplicateProfileFailure(id, message));
    }
}

export function* watchDuplicateProfile(): SagaIterator {
    yield takeEvery(DUPLICATE_PROFILE, duplicateProfileSaga);
}
