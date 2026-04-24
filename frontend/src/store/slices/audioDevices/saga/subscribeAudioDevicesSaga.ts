import { cancel, cancelled, fork, put, take, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { Task, EventChannel } from "redux-saga";
import type { SubscriptionAudioDeviceChangedSubscription } from "../../../../api/gql/graphql";
import { SubscriptionAudioDeviceChangedDocument } from "../../../../api/gql/graphql";
import { gqlSubscriptionChannel } from "../../../saga/graphql";
import {
  SUBSCRIBE_AUDIO_DEVICES,
  UNSUBSCRIBE_AUDIO_DEVICES,
  audioDeviceChanged,
  audioDevicesStreamClosed,
  audioDevicesStreamOpened,
} from "../actions";

let counter = 0;

function* consumeChannel(
  channel: EventChannel<SubscriptionAudioDeviceChangedSubscription>
): SagaIterator {
  try {
    yield put(audioDevicesStreamOpened());
    while (true) {
      const data: SubscriptionAudioDeviceChangedSubscription = yield take(channel);
      const payload = data.audioDeviceChanged;
      if (payload.kind === "snapshot") continue;
      const defaultName =
        payload.devices.find((d) => d.isDefault)?.name ?? payload.devices[0]?.name ?? "unknown";
      counter += 1;
      yield put(audioDeviceChanged({ id: counter, kind: payload.kind, defaultName }));
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
    }
    yield put(audioDevicesStreamClosed());
  }
}

function* subscribeAudioDevicesSaga(): SagaIterator {
  const channel: EventChannel<SubscriptionAudioDeviceChangedSubscription> = gqlSubscriptionChannel(
    SubscriptionAudioDeviceChangedDocument,
    {}
  );
  const consumer: Task = yield fork(consumeChannel, channel);
  try {
    yield take(UNSUBSCRIBE_AUDIO_DEVICES);
  } finally {
    yield cancel(consumer);
  }
}

export function* watchAudioDevicesSagas(): SagaIterator {
  yield takeLatest(SUBSCRIBE_AUDIO_DEVICES, subscribeAudioDevicesSaga);
}
