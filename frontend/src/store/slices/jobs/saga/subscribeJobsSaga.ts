import {eventChannel, type EventChannel, type Task} from "redux-saga";
import {call, cancel, cancelled, fork, put, take, takeLatest} from "redux-saga/effects";
import type {SagaIterator} from "redux-saga";

import {apiFactory} from "../../../../api";
import {API_ENDPOINTS, BACKEND_URL} from "../../../../constants/api";
import type {ProcessingJob} from "../../../../domain/ProcessingJob";
import {
    SUBSCRIBE_JOBS,
    UNSUBSCRIBE_JOBS,
    jobUpdated,
    jobsSeedFailed,
    jobsSeeded,
    jobsStreamClosed,
    jobsStreamOpened,
} from "../actions";

type EventSourceFactory = (url: string) => EventSource;

const defaultEventSourceFactory: EventSourceFactory = (url) => new EventSource(url);

let eventSourceFactory: EventSourceFactory = defaultEventSourceFactory;

export const __setEventSourceFactoryForTests = (factory: EventSourceFactory | null): void => {
    eventSourceFactory = factory ?? defaultEventSourceFactory;
};

export const createJobsChannel = (): EventChannel<ProcessingJob> =>
    eventChannel<ProcessingJob>((emit) => {
        const url = `${BACKEND_URL}${API_ENDPOINTS.jobsStream}`;
        const source = eventSourceFactory(url);
        const onMessage = (event: MessageEvent): void => {
            try {
                emit(JSON.parse(event.data) as ProcessingJob);
            } catch {
            }
        };
        source.addEventListener("job", onMessage as EventListener);
        return () => {
            source.removeEventListener("job", onMessage as EventListener);
            source.close();
        };
    });

function* consumeChannel(channel: EventChannel<ProcessingJob>): SagaIterator {
    try {
        yield put(jobsStreamOpened());
        while (true) {
            const job: ProcessingJob = yield take(channel);
            yield put(jobUpdated(job));
        }
    } finally {
        if (yield cancelled()) {
            channel.close();
        }
        yield put(jobsStreamClosed());
    }
}

export function* subscribeJobsSaga(): SagaIterator {
    const api = apiFactory.createJobsApi();
    try {
        const seed: ProcessingJob[] = yield call([api, api.listActive]);
        yield put(jobsSeeded(seed));
    } catch (error) {
        yield put(jobsSeedFailed(error instanceof Error ? error.message : String(error)));
    }

    const channel: EventChannel<ProcessingJob> = yield call(createJobsChannel);
    const consumer: Task = yield fork(consumeChannel, channel);

    try {
        yield take(UNSUBSCRIBE_JOBS);
    } finally {
        yield cancel(consumer);
    }
}

export function* watchSubscribeJobs(): SagaIterator {
    yield takeLatest(SUBSCRIBE_JOBS, subscribeJobsSaga);
}
