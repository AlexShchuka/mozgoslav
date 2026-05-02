import { cancel, cancelled, fork, put, take, takeEvery } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { Task, EventChannel } from "redux-saga";
import { DownloadState } from "../../../../api/gql/graphql";
import type { SubscriptionModelDownloadProgressSubscription } from "../../../../api/gql/graphql";
import { SubscriptionModelDownloadProgressDocument } from "../../../../api/gql/graphql";
import { gqlSubscriptionChannel } from "../../../saga/graphql";
import {
  SUBSCRIBE_MODEL_DOWNLOAD,
  UNSUBSCRIBE_MODEL_DOWNLOAD,
  modelDownloadCompleted,
  modelDownloadProgress,
  loadModels,
  type SubscribeModelDownloadAction,
  type UnsubscribeModelDownloadAction,
} from "../actions";

const TERMINAL_STATES = [DownloadState.Completed, DownloadState.Failed, DownloadState.Cancelled];

function* consumeChannel(
  channel: EventChannel<SubscriptionModelDownloadProgressSubscription>,
  downloadId: string
): SagaIterator {
  try {
    while (true) {
      const data: SubscriptionModelDownloadProgressSubscription = yield take(channel);
      const evt = data.modelDownloadProgress;
      const progress = {
        bytesRead: Number(evt.bytesRead),
        totalBytes: evt.totalBytes != null ? Number(evt.totalBytes) : null,
        phase: evt.phase,
        speedBytesPerSecond: evt.speedBytesPerSecond ?? null,
        error: evt.error ?? null,
      };
      yield put(modelDownloadProgress({ downloadId, ...progress }));
      if (TERMINAL_STATES.includes(evt.phase) || evt.error != null) {
        yield put(modelDownloadCompleted(downloadId));
        yield put(loadModels());
        break;
      }
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
    }
  }
}

function* perDownloadSaga(action: SubscribeModelDownloadAction): SagaIterator {
  const { downloadId } = action.payload;
  const channel: EventChannel<SubscriptionModelDownloadProgressSubscription> =
    gqlSubscriptionChannel(SubscriptionModelDownloadProgressDocument, { downloadId });
  const consumer: Task = yield fork(consumeChannel, channel, downloadId);

  while (true) {
    const a: UnsubscribeModelDownloadAction = yield take(UNSUBSCRIBE_MODEL_DOWNLOAD);
    if (a.payload.downloadId === downloadId) break;
  }

  yield cancel(consumer);
  channel.close();
}

export function* watchSubscribeModelDownload(): SagaIterator {
  yield takeEvery(SUBSCRIBE_MODEL_DOWNLOAD, perDownloadSaga);
}
