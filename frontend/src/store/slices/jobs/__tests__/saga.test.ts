import { expectSaga } from "redux-saga-test-plan";
import { runSaga, stdChannel } from "redux-saga";
import type { AnyAction } from "redux";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

import { graphqlClient, getGraphqlWsClient } from "../../../../api/graphqlClient";

import type { ProcessingJob } from "../../../../domain/ProcessingJob";
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
import { jobsReducer } from "../reducer";
import { cancelJobSaga, retryRecordingSaga, subscribeJobsSaga } from "../saga";

const mockedRequest = graphqlClient.request as jest.Mock;
const mockedGetWsClient = getGraphqlWsClient as jest.Mock;

type WsSubscribeHandler = {
  next: (value: { data: unknown }) => void;
  error: (err: unknown) => void;
  complete: () => void;
};

const makeWsClientStub = (): { subscribe: jest.Mock; dispose: jest.Mock } => {
  const dispose = jest.fn().mockResolvedValue(undefined);
  const subscribe = jest.fn((_params: unknown, _handlers: WsSubscribeHandler) => {
    return () => {};
  });
  return { subscribe, dispose };
};

const makeJob = (overrides: Partial<ProcessingJob> = {}) => ({
  id: "job-1",
  recordingId: "rec-1",
  profileId: "prof-1",
  status: "Transcribing" as ProcessingJob["status"],
  progress: 30,
  currentStep: "Transcribing audio",
  errorMessage: null,
  userHint: null,
  createdAt: "2026-04-19T20:00:00Z",
  startedAt: "2026-04-19T20:00:01Z",
  finishedAt: null,
  stages: [],
  ...overrides,
});

const gqlJobA = {
  __typename: "ProcessingJob" as const,
  id: "a",
  recordingId: "rec-1",
  profileId: "prof-1",
  status: "QUEUED" as unknown,
  progress: 0,
  currentStep: null,
  errorMessage: null,
  userHint: null,
  createdAt: "2026-04-19T20:00:00Z",
  startedAt: null,
  finishedAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("subscribeJobsSaga", () => {
  it("seeds from QueryJobs(first:200) and emits JOBS_SEEDED", async () => {
    const wsStub = makeWsClientStub();
    mockedGetWsClient.mockReturnValue(wsStub);
    mockedRequest.mockResolvedValueOnce({
      jobs: { nodes: [gqlJobA], pageInfo: { hasNextPage: false, endCursor: null } },
    });

    const result = await expectSaga(subscribeJobsSaga)
      .withReducer(jobsReducer)
      .put(
        jobsSeeded([
          makeJob({
            id: "a",
            status: "Queued",
            progress: 0,
            currentStep: null,
            errorMessage: null,
            userHint: null,
            startedAt: null,
            finishedAt: null,
          }),
        ])
      )
      .put(jobsStreamOpened())
      .dispatch(unsubscribeJobs())
      .silentRun(50);

    expect(result.storeState.byId.a.id).toBe("a");
  });

  it("emits JOBS_SEED_FAILED when QueryJobs throws but still opens the stream", async () => {
    const wsStub = makeWsClientStub();
    mockedGetWsClient.mockReturnValue(wsStub);
    mockedRequest.mockRejectedValueOnce(new Error("boom"));

    const result = await expectSaga(subscribeJobsSaga)
      .withReducer(jobsReducer)
      .put(jobsSeedFailed("boom"))
      .put(jobsStreamOpened())
      .dispatch(unsubscribeJobs())
      .silentRun(50);

    expect(result.storeState.lastError).toBe("boom");
  });

  it("forwards job progress events from the GQL subscription as JOB_UPDATED", async () => {
    let capturedHandlers: WsSubscribeHandler | null = null;
    const dispose = jest.fn().mockResolvedValue(undefined);
    const subscribe = jest.fn((_params: unknown, handlers: WsSubscribeHandler) => {
      capturedHandlers = handlers;
      return () => {};
    });
    const wsStub = { subscribe, dispose };
    mockedGetWsClient.mockReturnValue(wsStub);
    mockedRequest.mockResolvedValueOnce({
      jobs: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } },
    });

    const incoming = makeJob({
      id: "x",
      progress: 99,
      status: "Transcribing",
      currentStep: null,
      startedAt: null,
    });
    const gqlIncoming = {
      jobProgress: {
        __typename: "ProcessingJob" as const,
        id: "x",
        recordingId: "rec-1",
        profileId: "prof-1",
        status: "TRANSCRIBING" as unknown,
        progress: 99,
        currentStep: null,
        errorMessage: null,
        userHint: null,
        createdAt: "2026-04-19T20:00:00Z",
        startedAt: null,
        finishedAt: null,
      },
    };

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
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    capturedHandlers!.next({ data: gqlIncoming });
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
    channel.put(unsubscribeJobs() as AnyAction);
    await task.toPromise();

    expect(dispatched).toContainEqual(jobsSeeded([]));
    expect(dispatched).toContainEqual(jobsStreamOpened());
    expect(dispatched).toContainEqual(jobUpdated(incoming));
    expect(dispatched).toContainEqual(jobsStreamClosed());
  });
});

describe("cancelJobSaga", () => {
  it("calls cancelJob mutation with the job id", async () => {
    mockedRequest.mockResolvedValueOnce({ cancelJob: { errors: [] } });
    await expectSaga(cancelJobSaga, cancelJob("job-1")).silentRun(20);
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });

  it("swallows API errors silently", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("nope"));
    await expectSaga(cancelJobSaga, cancelJob("job-1")).silentRun(20);
  });
});

describe("retryRecordingSaga", () => {
  it("calls reprocessRecording mutation with id + profile", async () => {
    mockedRequest.mockResolvedValueOnce({ reprocessRecording: { recording: null, errors: [] } });
    await expectSaga(retryRecordingSaga, retryRecording("rec-1", "prof-1")).silentRun(20);
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });
});
