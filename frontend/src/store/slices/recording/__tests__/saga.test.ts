import { buffers, eventChannel } from "redux-saga";
import type { EventChannel } from "redux-saga";
import { expectSaga } from "redux-saga-test-plan";

jest.mock("../../../saga/graphql", () => ({
  gqlRequest: jest.fn(),
  gqlSubscriptionChannel: jest.fn(),
}));

import { gqlSubscriptionChannel } from "../../../saga/graphql";

import {
  liveTranscriptSubscribe,
  liveTranscriptUnsubscribe,
  liveTranscriptPartial,
  liveTranscriptCleared,
} from "../actions";
import { recordingReducer } from "../reducer";
import { liveTranscriptSubscribeSaga } from "../saga";
import type { SubscriptionRecordingPartialsSubscription } from "../../../../api/gql/graphql";

const mockedChannel = gqlSubscriptionChannel as jest.Mock;

function makeChannelWithEmit(): {
  emit: (value: SubscriptionRecordingPartialsSubscription) => void;
  channel: EventChannel<SubscriptionRecordingPartialsSubscription>;
} {
  let emitFn: ((value: SubscriptionRecordingPartialsSubscription) => void) | null = null;
  const channel = eventChannel<SubscriptionRecordingPartialsSubscription>((emit) => {
    emitFn = emit;
    return () => {};
  }, buffers.expanding(10));
  return { emit: (v) => emitFn!(v), channel };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("liveTranscriptSubscribeSaga", () => {
  it("dispatches liveTranscriptCleared when unsubscribe matches recordingId", async () => {
    const { channel } = makeChannelWithEmit();
    mockedChannel.mockReturnValueOnce(channel);

    const recordingId = "rec-abc";

    await expectSaga(liveTranscriptSubscribeSaga, liveTranscriptSubscribe(recordingId))
      .withReducer(recordingReducer)
      .dispatch(liveTranscriptUnsubscribe(recordingId))
      .put(liveTranscriptCleared(recordingId))
      .silentRun(100);
  });

  it("calls gqlSubscriptionChannel with the correct recordingId variable", async () => {
    const { channel } = makeChannelWithEmit();
    mockedChannel.mockReturnValueOnce(channel);

    const recordingId = "rec-xyz";

    await expectSaga(liveTranscriptSubscribeSaga, liveTranscriptSubscribe(recordingId))
      .withReducer(recordingReducer)
      .dispatch(liveTranscriptUnsubscribe(recordingId))
      .silentRun(50);

    expect(mockedChannel).toHaveBeenCalledTimes(1);
    const [, variables] = mockedChannel.mock.calls[0] as [unknown, { recordingId: string }];
    expect(variables.recordingId).toBe(recordingId);
  });

  it("dispatches liveTranscriptPartial when channel emits matching recordingId", async () => {
    const { emit, channel } = makeChannelWithEmit();
    mockedChannel.mockReturnValueOnce(channel);

    const recordingId = "rec-match";
    const partial: SubscriptionRecordingPartialsSubscription = {
      recordingPartials: {
        __typename: "RecordingPartialPayload",
        recordingId,
        sessionId: "sess-1",
        text: "hello world",
        startSeconds: 0,
        endSeconds: 1.5,
        isFinal: false,
        observedAt: "2024-01-01T00:00:00Z",
      },
    };

    emit(partial);

    await expectSaga(liveTranscriptSubscribeSaga, liveTranscriptSubscribe(recordingId))
      .withReducer(recordingReducer)
      .put(
        liveTranscriptPartial({
          recordingId,
          text: "hello world",
          observedAt: "2024-01-01T00:00:00Z",
        })
      )
      .dispatch(liveTranscriptUnsubscribe(recordingId))
      .silentRun(200);
  });

  it("does not dispatch liveTranscriptPartial for mismatched recordingId", async () => {
    const { emit, channel } = makeChannelWithEmit();
    mockedChannel.mockReturnValueOnce(channel);

    const recordingId = "rec-correct";
    const wrongPartial: SubscriptionRecordingPartialsSubscription = {
      recordingPartials: {
        __typename: "RecordingPartialPayload",
        recordingId: "rec-other",
        sessionId: "sess-1",
        text: "ignored",
        startSeconds: 0,
        endSeconds: 1,
        isFinal: false,
        observedAt: "2024-01-01T00:00:00Z",
      },
    };

    emit(wrongPartial);

    await expectSaga(liveTranscriptSubscribeSaga, liveTranscriptSubscribe(recordingId))
      .withReducer(recordingReducer)
      .not.put(
        liveTranscriptPartial({
          recordingId: "rec-other",
          text: "ignored",
          observedAt: "2024-01-01T00:00:00Z",
        })
      )
      .dispatch(liveTranscriptUnsubscribe(recordingId))
      .silentRun(200);
  });
});
