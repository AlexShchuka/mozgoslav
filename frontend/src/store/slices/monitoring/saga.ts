import { cancel, cancelled, fork, put, race, take, takeLatest } from "redux-saga/effects";
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

export function* subscribeRuntimeStateSaga(): SagaIterator {
  yield put(monitoringLoadRequested());

  let channel: EventChannel<SubscriptionRuntimeStateChangedSubscription> | null = null;
  let consumer: Task | null = null;

  try {
    channel = gqlSubscriptionChannel(SubscriptionRuntimeStateChangedDocument, {});
    consumer = yield fork(consumeRuntimeStateEvents, channel);

    yield race({
      unsubscribe: take(MONITORING_UNSUBSCRIBE),
    });
  } catch {
    yield put(monitoringLoadRequested());
  } finally {
    if (consumer !== null) {
      yield cancel(consumer);
    }
    if (channel !== null) {
      channel.close();
    }
  }
}

export function* reprobeRuntimeStateSaga(): SagaIterator {
  try {
    (yield* gqlRequest(
      MutationReprobeRuntimeStateDocument,
      {}
    )) as MutationReprobeRuntimeStateMutation;
    yield put(monitoringReprobeSucceeded());
    yield put(monitoringLoadRequested());
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
