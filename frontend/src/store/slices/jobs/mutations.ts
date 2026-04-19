import type {ProcessingJob} from "../../../domain/ProcessingJob";
import type {JobsState, PendingJob} from "./types";

export const seedJobs = (state: JobsState, jobs: ProcessingJob[]): JobsState => {
    const byId = jobs.reduce<Record<string, ProcessingJob>>((acc, job) => {
        acc[job.id] = job;
        return acc;
    }, {});
    return {...state, byId, lastError: null};
};

export const upsertJob = (state: JobsState, job: ProcessingJob): JobsState => {
    const nextPending = {...state.pending};
    for (const [tempId, pending] of Object.entries(state.pending)) {
        if (pending.recordingId && pending.recordingId === job.recordingId) {
            delete nextPending[tempId];
        }
    }
    return {
        ...state,
        byId: {...state.byId, [job.id]: job},
        pending: nextPending,
    };
};

export const setSeedError = (state: JobsState, error: string): JobsState => ({
    ...state,
    lastError: error,
});

export const setStreaming = (state: JobsState, isStreaming: boolean): JobsState => ({
    ...state,
    isStreaming,
});

export const addPending = (state: JobsState, pending: PendingJob): JobsState => ({
    ...state,
    pending: {...state.pending, [pending.tempId]: pending},
});

export const resolvePending = (
    state: JobsState,
    tempId: string,
    recordingId?: string,
): JobsState => {
    const existing = state.pending[tempId];
    if (!existing) {
        return state;
    }
    return {
        ...state,
        pending: {...state.pending, [tempId]: {...existing, recordingId}},
    };
};

export const failPending = (state: JobsState, tempId: string, error: string): JobsState => {
    const existing = state.pending[tempId];
    if (!existing) {
        return state;
    }
    return {
        ...state,
        pending: {...state.pending, [tempId]: {...existing, error}},
    };
};
