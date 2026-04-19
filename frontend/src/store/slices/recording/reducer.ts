import type {Reducer} from "redux";
import {
    LOAD_RECORDINGS,
    LOAD_RECORDINGS_FAILURE,
    LOAD_RECORDINGS_SUCCESS,
    LOAD_RECORDINGS_UNAVAILABLE,
    type RecordingAction,
} from "./actions";
import {initialRecordingState, type RecordingState} from "./types";

export const recordingReducer: Reducer<RecordingState> = (
    state: RecordingState = initialRecordingState,
    action
): RecordingState => {
    const typed = action as RecordingAction;
    switch (typed.type) {
        case LOAD_RECORDINGS:
            return {
                ...state,
                isLoading: true,
                error: null,
                isBackendUnavailable: false,
            };
        case LOAD_RECORDINGS_SUCCESS: {
            const payload = (typed as { payload: RecordingState["recordings"][string][] }).payload;
            const byId = payload.reduce<RecordingState["recordings"]>((acc, recording) => {
                acc[recording.id] = recording;
                return acc;
            }, {});
            return {
                ...state,
                recordings: byId,
                isLoading: false,
                error: null,
                isBackendUnavailable: false,
            };
        }
        case LOAD_RECORDINGS_FAILURE:
            return {
                ...state,
                isLoading: false,
                error: (typed as { payload: string }).payload,
                isBackendUnavailable: false,
            };
        case LOAD_RECORDINGS_UNAVAILABLE:
            return {
                ...state,
                isLoading: false,
                error: null,
                isBackendUnavailable: true,
                recordings: {},
            };
        default:
            return state;
    }
};
