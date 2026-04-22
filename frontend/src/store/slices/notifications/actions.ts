export const NOTIFY_SUCCESS = "notifications/NOTIFY_SUCCESS";
export const NOTIFY_ERROR = "notifications/NOTIFY_ERROR";
export const NOTIFY_WARNING = "notifications/NOTIFY_WARNING";
export const NOTIFY_INFO = "notifications/NOTIFY_INFO";

export interface NotifyPayload {
    readonly messageKey: string;
    readonly params?: Record<string, unknown>;
}

export interface NotifySuccessAction {
    type: typeof NOTIFY_SUCCESS;
    payload: NotifyPayload;
}

export interface NotifyErrorAction {
    type: typeof NOTIFY_ERROR;
    payload: NotifyPayload;
}

export interface NotifyWarningAction {
    type: typeof NOTIFY_WARNING;
    payload: NotifyPayload;
}

export interface NotifyInfoAction {
    type: typeof NOTIFY_INFO;
    payload: NotifyPayload;
}

export type NotificationAction =
    | NotifySuccessAction
    | NotifyErrorAction
    | NotifyWarningAction
    | NotifyInfoAction;

export const notifySuccess = (payload: NotifyPayload): NotifySuccessAction => ({
    type: NOTIFY_SUCCESS,
    payload,
});

export const notifyError = (payload: NotifyPayload): NotifyErrorAction => ({
    type: NOTIFY_ERROR,
    payload,
});

export const notifyWarning = (payload: NotifyPayload): NotifyWarningAction => ({
    type: NOTIFY_WARNING,
    payload,
});

export const notifyInfo = (payload: NotifyPayload): NotifyInfoAction => ({
    type: NOTIFY_INFO,
    payload,
});
