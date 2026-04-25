import { cancel, cancelled, fork, put, take, takeEvery, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import type { Task, EventChannel } from "redux-saga";

import type {
  QueryRecordingsQuery,
  SubscriptionRecordingPartialsSubscription,
} from "../../../api/gql/graphql";
import {
  MutationDeleteRecordingDocument,
  MutationImportRecordingsDocument,
  MutationUploadRecordingsDocument,
  QueryRecordingsDocument,
  SubscriptionRecordingPartialsDocument,
} from "../../../api/gql/graphql";
import { gqlRequest, gqlSubscriptionChannel } from "../../saga/graphql";
import {
  DELETE_RECORDING,
  IMPORT_RECORDINGS_REQUESTED,
  LIVE_TRANSCRIPT_SUBSCRIBE,
  LIVE_TRANSCRIPT_UNSUBSCRIBE,
  LOAD_RECORDINGS,
  UPLOAD_RECORDINGS_REQUESTED,
  deleteRecordingFailure,
  deleteRecordingSuccess,
  importRecordingsFailure,
  importRecordingsSuccess,
  liveTranscriptCleared,
  liveTranscriptPartial,
  loadRecordings,
  loadRecordingsFailure,
  loadRecordingsSuccess,
  loadRecordingsUnavailable,
  uploadRecordingsFailure,
  uploadRecordingsSuccess,
  type DeleteRecordingAction,
  type ImportRecordingsRequestedAction,
  type LiveTranscriptSubscribeAction,
  type LiveTranscriptUnsubscribeAction,
  type UploadRecordingsRequestedAction,
} from "./actions";
import { mapGqlRecording } from "./recordingMapper";

export function* loadRecordingsSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryRecordingsDocument, {
      first: 200,
    })) as QueryRecordingsQuery;
    const nodes = result.recordings?.nodes ?? [];
    const recordings = nodes.map(mapGqlRecording);
    yield put(loadRecordingsSuccess(recordings));
  } catch (error) {
    if (isBackendDown(error)) {
      yield put(loadRecordingsUnavailable());
      return;
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(loadRecordingsFailure(message));
  }
}

export function* deleteRecordingSaga(action: DeleteRecordingAction): SagaIterator {
  const id = action.payload;
  try {
    yield* gqlRequest(MutationDeleteRecordingDocument, { id });
    yield put(deleteRecordingSuccess(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(deleteRecordingFailure({ id, error: message }));
  }
}

export function* uploadRecordingsSaga(action: UploadRecordingsRequestedAction): SagaIterator {
  const { filePaths } = action.payload;
  try {
    yield* gqlRequest(MutationUploadRecordingsDocument, { input: { filePaths } });
    yield put(uploadRecordingsSuccess({ count: filePaths.length }));
    yield put(loadRecordings());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(uploadRecordingsFailure({ error: message }));
  }
}

export function* importRecordingsSaga(action: ImportRecordingsRequestedAction): SagaIterator {
  const { filePaths } = action.payload;
  try {
    yield* gqlRequest(MutationImportRecordingsDocument, { input: { filePaths } });
    yield put(importRecordingsSuccess({ count: filePaths.length }));
    yield put(loadRecordings());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(importRecordingsFailure({ error: message }));
  }
}

function* consumeLivePartials(
  recordingId: string,
  channel: EventChannel<SubscriptionRecordingPartialsSubscription>
): SagaIterator {
  try {
    while (true) {
      const data: SubscriptionRecordingPartialsSubscription = yield take(channel);
      const partial = data.recordingPartials;
      if (!partial || partial.recordingId !== recordingId) continue;
      yield put(
        liveTranscriptPartial({
          recordingId,
          text: partial.text,
          observedAt:
            typeof partial.observedAt === "string"
              ? partial.observedAt
              : new Date(partial.observedAt as unknown as number).toISOString(),
        })
      );
    }
  } finally {
    if (yield cancelled()) {
      channel.close();
    }
  }
}

export function* liveTranscriptSubscribeSaga(action: LiveTranscriptSubscribeAction): SagaIterator {
  const { recordingId } = action.payload;
  const channel: EventChannel<SubscriptionRecordingPartialsSubscription> = gqlSubscriptionChannel(
    SubscriptionRecordingPartialsDocument,
    { recordingId }
  );
  const consumer: Task = yield fork(consumeLivePartials, recordingId, channel);

  try {
    while (true) {
      const stop: LiveTranscriptUnsubscribeAction = yield take(LIVE_TRANSCRIPT_UNSUBSCRIBE);
      if (stop.payload.recordingId === recordingId) {
        break;
      }
    }
  } finally {
    yield cancel(consumer);
    yield put(liveTranscriptCleared(recordingId));
  }
}

const isBackendDown = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ENOTFOUND") ||
      error.message.includes("fetch failed") ||
      error.message.includes("Failed to fetch")
    );
  }
  return false;
};

export function* watchRecordingSagas(): SagaIterator {
  yield takeLatest(LOAD_RECORDINGS, loadRecordingsSaga);
  yield takeEvery(DELETE_RECORDING, deleteRecordingSaga);
  yield takeEvery(UPLOAD_RECORDINGS_REQUESTED, uploadRecordingsSaga);
  yield takeEvery(IMPORT_RECORDINGS_REQUESTED, importRecordingsSaga);
  yield takeEvery(LIVE_TRANSCRIPT_SUBSCRIBE, liveTranscriptSubscribeSaga);
}
