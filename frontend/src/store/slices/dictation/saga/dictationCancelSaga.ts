import { put, select, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { MutationDictationCancelMutation } from "../../../../api/gql/graphql";
import { MutationDictationCancelDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { DICTATION_CANCEL_REQUESTED, dictationCancelFailed, dictationCancelled } from "../actions";
import { notifyError } from "../../notifications";
import { selectDictationStatus } from "../selectors";
import type { DictationStatus } from "../types";

function* dictationCancelSaga(): SagaIterator {
  const status = (yield select(selectDictationStatus)) as DictationStatus;
  if (status.phase !== "cancelling") return;
  const { sessionId } = status;
  try {
    const result = (yield* gqlRequest(MutationDictationCancelDocument, {
      sessionId,
    })) as MutationDictationCancelMutation;
    const errors = result.dictationCancel.errors;
    if (errors && errors.length > 0) {
      const firstMsg = errors[0]!.message;
      yield put(dictationCancelFailed({ error: firstMsg }));
      yield put(
        notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message: firstMsg } })
      );
      return;
    }
    yield put(dictationCancelled());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(dictationCancelFailed({ error: message }));
    yield put(notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message } }));
  }
}

export function* watchDictationCancel(): SagaIterator {
  yield takeEvery(DICTATION_CANCEL_REQUESTED, dictationCancelSaga);
}
