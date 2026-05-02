import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { MutationCancelModelDownloadMutation } from "../../../../api/gql/graphql";
import { MutationCancelModelDownloadDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { notifyError } from "../../notifications";
import {
  CANCEL_MODEL_DOWNLOAD_REQUESTED,
  cancelModelDownloadSuccess,
  cancelModelDownloadFailure,
  type CancelModelDownloadRequestedAction,
} from "../actions";

export function* cancelModelDownloadSaga(action: CancelModelDownloadRequestedAction): SagaIterator {
  const downloadId = action.payload;
  try {
    const result = (yield* gqlRequest(MutationCancelModelDownloadDocument, {
      downloadId,
    })) as MutationCancelModelDownloadMutation;

    const { ok, errors } = result.cancelModelDownload;

    if (ok) {
      yield put(cancelModelDownloadSuccess(downloadId));
    } else {
      const msg = errors[0]?.message ?? "Unknown error";
      yield put(cancelModelDownloadFailure({ downloadId, error: msg }));
      yield put(
        notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message: msg } })
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    yield put(cancelModelDownloadFailure({ downloadId, error: msg }));
    yield put(
      notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message: msg } })
    );
  }
}

export function* watchCancelModelDownload(): SagaIterator {
  yield takeEvery(CANCEL_MODEL_DOWNLOAD_REQUESTED, cancelModelDownloadSaga);
}
