import {expectSaga} from "redux-saga-test-plan";
import * as matchers from "redux-saga-test-plan/matchers";
import {throwError} from "redux-saga-test-plan/providers";
import {runSaga, stdChannel} from "redux-saga";
import type {AnyAction} from "redux";

import type {ProcessingJob} from "../../../../domain/ProcessingJob";
import {
    cancelJob,
    jobUpdated,
    jobsSeedFailed,
    jobsSeeded,
    jobsStreamClosed,
    jobsStreamOpened,
    retryRecording,
    unsubscribeJobs,
} from "../actions";
import {jobsReducer} from "../reducer";
import {
    __setEventSourceFactoryForTests,
    cancelJobSaga,
    retryRecordingSaga,
    subscribeJobsSaga,
} from "../saga";

jest.mock("../../../../api", () => {
    const jobsStub = {
        list: jest.fn(),
        listActive: jest.fn(),
        cancel: jest.fn(),
    };
    const recordingStub = {
        reprocess: jest.fn(),
    };
    return {
        apiFactory: {
            createJobsApi: () => jobsStub,
            createRecordingApi: () => recordingStub,
        },
        __jobsStub: jobsStub,
        __recordingStub: recordingStub,
    };
});

const stubs = jest.requireMock("../../../../api") as {
    __jobsStub: {listActive: jest.Mock; cancel: jest.Mock; list: jest.Mock};
    __recordingStub: {reprocess: jest.Mock};
};

interface FakeEventSource {
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    close: jest.Mock;
    emit: (job: ProcessingJob) => void;
}

const makeFakeEventSource = (): FakeEventSource => {
    let handler: ((event: MessageEvent) => void) | null = null;
    return {
        addEventListener: jest.fn((_name: string, cb: (event: MessageEvent) => void) => {
            handler = cb;
        }),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        emit: (job) => handler?.(new MessageEvent("job", {data: JSON.stringify(job)})),
    };
};

const makeJob = (overrides: Partial<ProcessingJob> = {}): ProcessingJob => ({
    id: "job-1",
    recordingId: "rec-1",
    profileId: "prof-1",
    status: "Transcribing",
    progress: 30,
    currentStep: "Transcribing audio",
    errorMessage: null,
    userHint: null,
    createdAt: "2026-04-19T20:00:00Z",
    startedAt: "2026-04-19T20:00:01Z",
    finishedAt: null,
    ...overrides,
});

beforeEach(() => {
    jest.clearAllMocks();
    __setEventSourceFactoryForTests(null);
});

describe("subscribeJobsSaga", () => {
    it("seeds from listActive and emits JOBS_SEEDED", async () => {
        const seed = [makeJob({id: "a"})];
        stubs.__jobsStub.listActive.mockResolvedValueOnce(seed);
        const fake = makeFakeEventSource();
        __setEventSourceFactoryForTests(() => fake as unknown as EventSource);

        const result = await expectSaga(subscribeJobsSaga)
            .withReducer(jobsReducer)
            .put(jobsSeeded(seed))
            .put(jobsStreamOpened())
            .dispatch(unsubscribeJobs())
            .silentRun(50);

        expect(result.storeState.byId.a.id).toBe("a");
        expect(fake.close).toHaveBeenCalled();
    });

    it("emits JOBS_SEED_FAILED when listActive throws but still opens the stream", async () => {
        stubs.__jobsStub.listActive.mockImplementationOnce(() => Promise.reject(new Error("boom")));
        const fake = makeFakeEventSource();
        __setEventSourceFactoryForTests(() => fake as unknown as EventSource);

        const result = await expectSaga(subscribeJobsSaga)
            .withReducer(jobsReducer)
            .put(jobsSeedFailed("boom"))
            .put(jobsStreamOpened())
            .dispatch(unsubscribeJobs())
            .silentRun(50);

        expect(result.storeState.lastError).toBe("boom");
    });

    it("forwards JOB events from the EventSource as JOB_UPDATED", async () => {
        stubs.__jobsStub.listActive.mockResolvedValueOnce([]);
        const fake = makeFakeEventSource();
        __setEventSourceFactoryForTests(() => fake as unknown as EventSource);
        const incoming = makeJob({id: "x", progress: 99});

        const dispatched: AnyAction[] = [];
        const channel = stdChannel<AnyAction>();
        const io = {
            dispatch: (action: AnyAction): void => {
                dispatched.push(action);
                channel.put(action);
            },
            channel,
        };

        const task = runSaga(io as never, subscribeJobsSaga);
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
        fake.emit(incoming);
        await new Promise<void>((resolve) => setTimeout(resolve, 10));
        channel.put(unsubscribeJobs() as AnyAction);
        await task.toPromise();

        expect(dispatched).toContainEqual(jobsSeeded([]));
        expect(dispatched).toContainEqual(jobsStreamOpened());
        expect(dispatched).toContainEqual(jobUpdated(incoming));
        expect(dispatched).toContainEqual(jobsStreamClosed());
        expect(fake.close).toHaveBeenCalled();
    });
});

describe("cancelJobSaga", () => {
    it("calls JobsApi.cancel with the job id", async () => {
        stubs.__jobsStub.cancel.mockResolvedValueOnce(undefined);
        await expectSaga(cancelJobSaga, cancelJob("job-1")).silentRun(20);
        expect(stubs.__jobsStub.cancel).toHaveBeenCalledWith("job-1");
    });

    it("swallows API errors (SSE will surface real state)", async () => {
        await expectSaga(cancelJobSaga, cancelJob("job-1"))
            .provide([[matchers.call.fn(stubs.__jobsStub.cancel), throwError(new Error("nope"))]])
            .silentRun(20);
    });
});

describe("retryRecordingSaga", () => {
    it("calls RecordingApi.reprocess with id + profile", async () => {
        stubs.__recordingStub.reprocess.mockResolvedValueOnce({});
        await expectSaga(retryRecordingSaga, retryRecording("rec-1", "prof-1")).silentRun(20);
        expect(stubs.__recordingStub.reprocess).toHaveBeenCalledWith("rec-1", "prof-1");
    });
});
