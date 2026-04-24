import { cancel, cancelled, fork, put, take, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { Task, EventChannel } from "redux-saga";

import type { SubscriptionHotkeyEventsSubscription } from "../../../../api/gql/graphql";
import { SubscriptionHotkeyEventsDocument } from "../../../../api/gql/graphql";
import { gqlSubscriptionChannel } from "../../../saga/graphql";
import {
  SUBSCRIBE_HOTKEYS,
  UNSUBSCRIBE_HOTKEYS,
  hotkeyPressed,
  hotkeyReleased,
  hotkeysStreamOpened,
  hotkeysStreamClosed,
} from "../actions";

function* consumeChannel(
  channel: EventChannel<SubscriptionHotkeyEventsSubscription>
): SagaIterator {
  try {
    yield put(hotkeysStreamOpened());
    while (true) {
      const data: SubscriptionHotkeyEventsSubscription = yield take(channel);
      const frame = data.hotkeyEvents;
      if (frame.kind === "press") {
        yield put(
          hotkeyPressed({
            kind: "press",
            accelerator: frame.accelerator,
            observedAt: frame.observedAt,
          })
        );
      } else if (frame.kind === "release") {
        yield put(
          hotkeyReleased({
            kind: "release",
            accelerator: frame.accelerator,
            observedAt: frame.observedAt,
          })
        );
      }
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
    }
    yield put(hotkeysStreamClosed());
  }
}

function* subscribeHotkeysSaga(): SagaIterator {
  const channel: EventChannel<SubscriptionHotkeyEventsSubscription> = gqlSubscriptionChannel(
    SubscriptionHotkeyEventsDocument,
    {}
  );
  const consumer: Task = yield fork(consumeChannel, channel);
  try {
    yield take(UNSUBSCRIBE_HOTKEYS);
  } finally {
    yield cancel(consumer);
  }
}

export function* watchHotkeysSagas(): SagaIterator {
  yield takeLatest(SUBSCRIBE_HOTKEYS, subscribeHotkeysSaga);
}
