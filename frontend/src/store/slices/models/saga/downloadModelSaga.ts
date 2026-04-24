import { put, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { MutationDownloadModelMutation } from "../../../../api/gql/graphql";
import { MutationDownloadModelDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import { notifyError } from "../../notifications";
import {
  DOWNLOAD_MODEL_REQUESTED,
  downloadModelRequestFailed,
  downloadModelStarted,
  subscribeModelDownload,
  type DownloadModelRequestedAction,
} from "../actions";

function* downloadModelSaga(action: DownloadModelRequestedAction): SagaIterator {
  const catalogueId = action.payload;
  try {
    const result = (yield* gqlRequest(MutationDownloadModelDocument, {
      catalogueId,
    })) as MutationDownloadModelMutation;

    const { downloadId, errors } = result.downloadModel;

    if (downloadId) {
      yield put(downloadModelStarted({ catalogueId, downloadId }));
      yield put(subscribeModelDownload(downloadId));
    } else {
      const msg = errors[0]?.message ?? "Unknown error";
      yield put(downloadModelRequestFailed({ catalogueId, error: msg }));
      yield put(
        notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message: msg } })
      );
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    yield put(downloadModelRequestFailed({ catalogueId, error: msg }));
    yield put(
      notifyError({ messageKey: "errors.genericErrorWithMessage", params: { message: msg } })
    );
  }
}

export function* watchDownloadModel(): SagaIterator {
  yield takeEvery(DOWNLOAD_MODEL_REQUESTED, downloadModelSaga);
}
