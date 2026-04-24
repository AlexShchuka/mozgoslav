import { put, select, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { MutationDictationStopMutation } from "../../../../api/gql/graphql";
import { MutationDictationStopDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { DICTATION_STOP_REQUESTED, dictationFailed, dictationStopped } from "../actions";
import { selectDictationStatus } from "../selectors";
import type { DictationStatus } from "../types";

function* dictationStopSaga(): SagaIterator {
  const status = (yield select(selectDictationStatus)) as DictationStatus;
  if (status.phase !== "stopping") return;
  const { sessionId } = status;
  try {
    const result = (yield* gqlRequest(MutationDictationStopDocument, {
      sessionId,
    })) as MutationDictationStopMutation;
    const polishedText = result.dictationStop.polishedText ?? null;
    yield put(dictationStopped({ polishedText }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(dictationFailed({ error: message }));
  }
}

export function* watchDictationStop(): SagaIterator {
  yield takeEvery(DICTATION_STOP_REQUESTED, dictationStopSaga);
}
