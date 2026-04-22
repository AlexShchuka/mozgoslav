import {call, takeEvery} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";
import {toast} from "react-toastify";

import i18n from "../../../../i18n";
import {
    NOTIFY_ERROR,
    NOTIFY_INFO,
    NOTIFY_SUCCESS,
    NOTIFY_WARNING,
    type NotificationAction,
} from "../actions";

const translate = i18n.t.bind(i18n) as unknown as (
    key: string,
    params?: Record<string, unknown>,
) => string;

export function* showNotification(action: NotificationAction): SagaIterator {
    const message = translate(action.payload.messageKey, action.payload.params);
    switch (action.type) {
        case NOTIFY_SUCCESS:
            yield call([toast, toast.success], message);
            return;
        case NOTIFY_ERROR:
            yield call([toast, toast.error], message);
            return;
        case NOTIFY_WARNING:
            yield call([toast, toast.warning], message);
            return;
        case NOTIFY_INFO:
            yield call([toast, toast.info], message);
            return;
    }
}

export function* watchNotificationsSagas(): SagaIterator {
    yield takeEvery(
        [NOTIFY_SUCCESS, NOTIFY_ERROR, NOTIFY_WARNING, NOTIFY_INFO],
        showNotification,
    );
}
