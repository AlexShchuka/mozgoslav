import { cancel, delay, fork, put, take, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { Task } from "redux-saga";

import type { QueryObsidianDetectQuery } from "../../../../api/gql/graphql";
import { QueryObsidianDetectDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  obsidianDetectionUpdated,
  START_OBSIDIAN_DETECT_PROBE,
  STOP_OBSIDIAN_DETECT_PROBE,
} from "../actions";

function* pollLoop(): SagaIterator {
  while (true) {
    try {
      const data = (yield* gqlRequest(QueryObsidianDetectDocument, {})) as QueryObsidianDetectQuery;
      yield put(obsidianDetectionUpdated({ detected: data.obsidianDetect.detected }));
    } catch {
      yield put(obsidianDetectionUpdated({ detected: [] }));
    }
    yield delay(5000);
  }
}

export function* obsidianDetectProbeSaga(): SagaIterator {
  const task: Task = (yield fork(pollLoop)) as Task;
  yield take(STOP_OBSIDIAN_DETECT_PROBE);
  yield cancel(task);
}

export function* watchObsidianDetectProbe(): SagaIterator {
  yield takeLatest(START_OBSIDIAN_DETECT_PROBE, obsidianDetectProbeSaga);
}
