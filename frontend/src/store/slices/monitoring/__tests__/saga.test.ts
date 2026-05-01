import { buffers, END, eventChannel } from "redux-saga";
import type { EventChannel } from "redux-saga";
import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../../api/graphqlClient", () => ({
  graphqlClient: { request: jest.fn() },
  getGraphqlWsClient: jest.fn(),
}));

jest.mock("../../../saga/graphql", () => ({
  ...jest.requireActual("../../../saga/graphql"),
  gqlSubscriptionChannel: jest.fn(),
}));

import { graphqlClient } from "../../../../api/graphqlClient";
import { gqlSubscriptionChannel } from "../../../saga/graphql";
import {
  monitoringLoadFailed,
  monitoringLoadRequested,
  monitoringLoadSucceeded,
  monitoringReprobeFailed,
  monitoringReprobeSucceeded,
  monitoringStateUpdated,
  monitoringSubscribe,
  monitoringUnsubscribe,
} from "../actions";
import { loadRuntimeStateSaga, reprobeRuntimeStateSaga, subscribeRuntimeStateSaga } from "../saga";
import type { SubscriptionRuntimeStateChangedSubscription } from "../../../../api/gql/graphql";

const mockedRequest = graphqlClient.request as jest.Mock;
const mockedGqlSubscriptionChannel = gqlSubscriptionChannel as jest.Mock;

const makeRuntimeState = () => ({
  llm: {
    endpoint: "http://localhost:1234",
    online: true,
    lastProbedAt: "2024-01-01T00:00:00Z",
    model: "test-model",
    contextLength: 4096,
    supportsToolCalling: true,
    supportsJsonMode: false,
    lastError: null,
  },
  syncthing: {
    detection: "running",
    binaryPath: "/usr/local/bin/syncthing",
    apiUrl: "http://localhost:8384",
    version: "v1.27.0",
    hint: null,
  },
  services: [],
});

function makeChannelWithControl(): {
  emit: (value: SubscriptionRuntimeStateChangedSubscription) => void;
  close: () => void;
  channel: EventChannel<SubscriptionRuntimeStateChangedSubscription>;
} {
  let emitFn: ((value: SubscriptionRuntimeStateChangedSubscription | typeof END) => void) | null =
    null;
  const channel = eventChannel<SubscriptionRuntimeStateChangedSubscription>((emit) => {
    emitFn = emit;
    return () => {};
  }, buffers.expanding(10));
  return {
    emit: (v) => emitFn!(v),
    close: () => emitFn!(END),
    channel,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("loadRuntimeStateSaga", () => {
  it("puts monitoringLoadSucceeded on success", async () => {
    const runtimeState = makeRuntimeState();
    mockedRequest.mockResolvedValueOnce({ runtimeState });

    await expectSaga(loadRuntimeStateSaga)
      .put(monitoringLoadSucceeded(runtimeState as ReturnType<typeof makeRuntimeState>))
      .silentRun(50);
  });

  it("puts monitoringLoadFailed when request throws", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("network error"));

    await expectSaga(loadRuntimeStateSaga).put(monitoringLoadFailed("network error")).silentRun(50);
  });
});

describe("subscribeRuntimeStateSaga", () => {
  it("dispatches monitoringLoadRequested on start", async () => {
    const { channel } = makeChannelWithControl();
    mockedGqlSubscriptionChannel.mockReturnValueOnce(channel);
    mockedRequest.mockResolvedValue({ runtimeState: makeRuntimeState() });

    await expectSaga(subscribeRuntimeStateSaga)
      .put(monitoringLoadRequested())
      .dispatch(monitoringUnsubscribe())
      .silentRun(100);
  });

  it("dispatches monitoringStateUpdated for each channel event", async () => {
    const { emit, channel } = makeChannelWithControl();
    mockedGqlSubscriptionChannel.mockReturnValueOnce(channel);
    mockedRequest.mockResolvedValue({ runtimeState: makeRuntimeState() });

    const state = makeRuntimeState();
    emit({ runtimeStateChanged: state as ReturnType<typeof makeRuntimeState> });

    await expectSaga(subscribeRuntimeStateSaga)
      .put(monitoringStateUpdated(state as ReturnType<typeof makeRuntimeState>))
      .dispatch(monitoringUnsubscribe())
      .silentRun(200);
  });

  it("returns without dispatching monitoringLoadFailed when unsubscribe fires", async () => {
    const { channel } = makeChannelWithControl();
    mockedGqlSubscriptionChannel.mockReturnValueOnce(channel);
    mockedRequest.mockResolvedValue({ runtimeState: makeRuntimeState() });

    await expectSaga(subscribeRuntimeStateSaga)
      .put(monitoringLoadRequested())
      .dispatch(monitoringUnsubscribe())
      .not.put(monitoringLoadFailed("Subscription reconnect failed after 5 attempts"))
      .silentRun(100);
  });

  it("opens a second channel after the first closes (reconnect)", async () => {
    const first = makeChannelWithControl();
    const second = makeChannelWithControl();

    mockedGqlSubscriptionChannel
      .mockReturnValueOnce(first.channel)
      .mockReturnValueOnce(second.channel);
    mockedRequest.mockResolvedValue({ runtimeState: makeRuntimeState() });

    setTimeout(() => {
      first.close();
    }, 50);

    await expectSaga(subscribeRuntimeStateSaga).silentRun(3000);

    expect(mockedGqlSubscriptionChannel).toHaveBeenCalledTimes(2);
  });

  it("gives up after 5 reconnect attempts and dispatches monitoringLoadFailed", async () => {
    for (let i = 0; i < 5; i++) {
      const ctrl = makeChannelWithControl();
      mockedGqlSubscriptionChannel.mockReturnValueOnce(ctrl.channel);
      ctrl.close();
    }
    mockedRequest.mockResolvedValue({ runtimeState: makeRuntimeState() });

    await expectSaga(subscribeRuntimeStateSaga)
      .put(monitoringLoadFailed("Subscription reconnect failed after 5 attempts"))
      .silentRun(200000);
  }, 300000);
});

describe("reprobeRuntimeStateSaga", () => {
  it("puts monitoringReprobeSucceeded and monitoringLoadSucceeded with returned state", async () => {
    const state = makeRuntimeState();
    mockedRequest.mockResolvedValueOnce({
      reprobeRuntimeState: { state, errors: [] },
    });

    await expectSaga(reprobeRuntimeStateSaga)
      .put(monitoringReprobeSucceeded())
      .put(monitoringLoadSucceeded(state as ReturnType<typeof makeRuntimeState>))
      .silentRun(50);
  });

  it("puts monitoringReprobeFailed on UserError", async () => {
    mockedRequest.mockResolvedValueOnce({
      reprobeRuntimeState: {
        state: null,
        errors: [{ code: "UNAVAILABLE", message: "Service unavailable" }],
      },
    });

    await expectSaga(reprobeRuntimeStateSaga)
      .put(monitoringReprobeFailed("Service unavailable"))
      .silentRun(50);
  });

  it("puts monitoringReprobeFailed on transport error", async () => {
    mockedRequest.mockRejectedValueOnce(new Error("timeout"));

    await expectSaga(reprobeRuntimeStateSaga).put(monitoringReprobeFailed("timeout")).silentRun(50);
  });

  it("does not dispatch monitoringLoadRequested — uses returned payload directly", async () => {
    const state = makeRuntimeState();
    mockedRequest.mockResolvedValueOnce({
      reprobeRuntimeState: { state, errors: [] },
    });

    await expectSaga(reprobeRuntimeStateSaga).not.put(monitoringLoadRequested()).silentRun(50);
  });
});

void monitoringSubscribe;
