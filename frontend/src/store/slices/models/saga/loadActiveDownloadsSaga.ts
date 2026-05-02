import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { QueryActiveDownloadsQuery } from "../../../../api/gql/graphql";
import { QueryActiveDownloadsDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  LOAD_ACTIVE_DOWNLOADS,
  loadActiveDownloadsSuccess,
  loadActiveDownloadsFailure,
} from "../actions";
import type { ActiveDownload } from "../types";

export function* loadActiveDownloadsSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(
      QueryActiveDownloadsDocument,
      {}
    )) as QueryActiveDownloadsQuery;
    const downloads: ActiveDownload[] = result.activeDownloads.map((d) => ({
      id: d.id,
      catalogueId: d.catalogueId,
      state: d.state,
      bytesReceived: d.bytesReceived,
      totalBytes: d.totalBytes ?? null,
      speedBytesPerSecond: d.speedBytesPerSecond ?? null,
      errorMessage: d.errorMessage ?? null,
      startedAt: d.startedAt ?? null,
    }));
    yield put(loadActiveDownloadsSuccess(downloads));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    yield put(loadActiveDownloadsFailure(msg));
  }
}

export function* watchLoadActiveDownloads(): SagaIterator {
  yield takeLatest(LOAD_ACTIVE_DOWNLOADS, loadActiveDownloadsSaga);
}
