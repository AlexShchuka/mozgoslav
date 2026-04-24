import { cancel, cancelled, fork, put, take, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { Task, EventChannel } from "redux-saga";

import type {
  QueryJobsQuery,
  SubscriptionJobProgressSubscription,
} from "../../../../api/gql/graphql";
import { QueryJobsDocument, SubscriptionJobProgressDocument } from "../../../../api/gql/graphql";
import { gqlRequest, gqlSubscriptionChannel } from "../../../saga/graphql";
import { mapGqlJob } from "../jobMapper";
import {
  SUBSCRIBE_JOBS,
  UNSUBSCRIBE_JOBS,
  jobUpdated,
  jobsSeedFailed,
  jobsSeeded,
  jobsStreamClosed,
  jobsStreamOpened,
} from "../actions";

function* consumeChannel(channel: EventChannel<SubscriptionJobProgressSubscription>): SagaIterator {
  try {
    yield put(jobsStreamOpened());
    while (true) {
      const data: SubscriptionJobProgressSubscription = yield take(channel);
      yield put(jobUpdated(mapGqlJob(data.jobProgress)));
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
    }
    yield put(jobsStreamClosed());
  }
}

export function* subscribeJobsSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryJobsDocument, { first: 200 })) as QueryJobsQuery;
    const jobs = (result.jobs?.nodes ?? []).map(mapGqlJob);
    yield put(jobsSeeded(jobs));
  } catch (error) {
    yield put(jobsSeedFailed(error instanceof Error ? error.message : String(error)));
  }

  const channel: EventChannel<SubscriptionJobProgressSubscription> = gqlSubscriptionChannel(
    SubscriptionJobProgressDocument,
    {}
  );
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
