import { cancel, delay, fork, put, take, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { Task } from "redux-saga";

import type { QueryLlmHealthQuery } from "../../../../api/gql/graphql";
import { QueryLlmHealthDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { llmHealthUpdated, START_LLM_HEALTH_PROBE, STOP_LLM_HEALTH_PROBE } from "../actions";

function* pollLoop(): SagaIterator {
  while (true) {
    try {
      const data = (yield* gqlRequest(QueryLlmHealthDocument, {})) as QueryLlmHealthQuery;
      yield put(llmHealthUpdated({ reachable: data.llmHealth.available }));
    } catch {
      yield put(llmHealthUpdated({ reachable: false }));
    }
    yield delay(3000);
  }
}

export function* llmHealthProbeSaga(): SagaIterator {
  const task: Task = (yield fork(pollLoop)) as Task;
  yield take(STOP_LLM_HEALTH_PROBE);
  yield cancel(task);
}

export function* watchLlmHealthProbe(): SagaIterator {
  yield takeLatest(START_LLM_HEALTH_PROBE, llmHealthProbeSaga);
}
