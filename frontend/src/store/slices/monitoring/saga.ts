import {
  cancel,
  cancelled,
  delay,
  fork,
  join,
  put,
  race,
  take,
  takeLatest,
} from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { Task, EventChannel } from "redux-saga";

import type {
  QueryRuntimeStateQuery,
  SubscriptionRuntimeStateChangedSubscription,
  MutationReprobeRuntimeStateMutation,
} from "../../../api/gql/graphql";
import {
  QueryRuntimeStateDocument,
  SubscriptionRuntimeStateChangedDocument,
  MutationReprobeRuntimeStateDocument,
} from "../../../api/gql/graphql";
import { gqlRequest, gqlSubscriptionChannel } from "../../saga/graphql";
import {
  MONITORING_LOAD_REQUESTED,
  MONITORING_REPROBE_REQUESTED,
  MONITORING_SUBSCRIBE,
  MONITORING_UNSUBSCRIBE,
  monitoringLoadFailed,
  monitoringLoadSucceeded,
  monitoringLoadRequested,
  monitoringReprobeFailed,
  monitoringReprobeSucceeded,
  monitoringStateUpdated,
} from "./actions";

export function* loadRuntimeStateSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryRuntimeStateDocument, {})) as QueryRuntimeStateQuery;
    yield put(monitoringLoadSucceeded(result.runtimeState));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(monitoringLoadFailed(message));
  }
}

function* consumeRuntimeStateEvents(
  channel: EventChannel<SubscriptionRuntimeStateChangedSubscription>
): SagaIterator {
  try {
    while (true) {
      const event: SubscriptionRuntimeStateChangedSubscription = yield take(channel);
      if (event.runtimeStateChanged) {
        yield put(monitoringStateUpdated(event.runtimeStateChanged));
      }
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
    }
  }
}

const MAX_RECONNECT_ATTEMPTS = 5;

export function* subscribeRuntimeStateSaga(): SagaIterator {
  yield put(monitoringLoadRequested());

  let attempt = 0;

  while (attempt < MAX_RECONNECT_ATTEMPTS) {
    let channel: EventChannel<SubscriptionRuntimeStateChangedSubscription> | null = null;
    let consumer: Task | null = null;

    try {
      channel = gqlSubscriptionChannel(SubscriptionRuntimeStateChangedDocument, {});
      consumer = (yield fork(consumeRuntimeStateEvents, channel)) as Task;

      const result = (yield race({
        unsubscribe: take(MONITORING_UNSUBSCRIBE),
        channelClosed: join(consumer),
      })) as { unsubscribe?: unknown; channelClosed?: unknown };

      if (result.unsubscribe) {
        return;
      }

      attempt += 1;
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      yield delay(backoffMs);
    } finally {
      if (consumer !== null && !(consumer as Task).isCancelled()) {
        yield cancel(consumer as Task);
      }
      if (channel !== null) {
        channel.close();
      }
    }
  }

  yield put(
    monitoringLoadFailed(`Subscription reconnect failed after ${MAX_RECONNECT_ATTEMPTS} attempts`)
  );
}

export function* reprobeRuntimeStateSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(
      MutationReprobeRuntimeStateDocument,
      {}
    )) as MutationReprobeRuntimeStateMutation;

    const errors = result.reprobeRuntimeState.errors ?? [];
    if (errors.length > 0) {
      yield put(monitoringReprobeFailed(errors[0].message));
      return;
    }

    const state = result.reprobeRuntimeState.state;
    if (state) {
      yield put(monitoringReprobeSucceeded());
      yield put(monitoringLoadSucceeded(state));
    } else {
      yield put(monitoringReprobeFailed("Reprobe returned no state"));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(monitoringReprobeFailed(message));
  }
}

export function* watchMonitoringSagas(): SagaIterator {
  yield takeLatest(MONITORING_LOAD_REQUESTED, loadRuntimeStateSaga);
  yield takeLatest(MONITORING_SUBSCRIBE, subscribeRuntimeStateSaga);
  yield takeLatest(MONITORING_REPROBE_REQUESTED, reprobeRuntimeStateSaga);
}
