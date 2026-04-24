import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { MutationDictationStartMutation } from "../../../../api/gql/graphql";
import { MutationDictationStartDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  DICTATION_START_REQUESTED,
  dictationFailed,
  dictationStarted,
  type DictationStartRequestedAction,
} from "../actions";

function* dictationStartSaga(action: DictationStartRequestedAction): SagaIterator {
  try {
    const result = (yield* gqlRequest(MutationDictationStartDocument, {
      source: action.payload.source,
    })) as MutationDictationStartMutation;
    const sessionId = result.dictationStart.sessionId;
    if (!sessionId) {
      yield put(dictationFailed({ error: "dictation start failed" }));
      return;
    }
    yield put(dictationStarted({ sessionId }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(dictationFailed({ error: message }));
  }
}

export function* watchDictationStart(): SagaIterator {
  yield takeEvery(DICTATION_START_REQUESTED, dictationStartSaga);
}
