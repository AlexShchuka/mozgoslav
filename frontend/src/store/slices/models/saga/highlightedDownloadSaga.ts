import { delay, put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import {
  SET_HIGHLIGHTED_DOWNLOAD,
  clearHighlightedDownload,
} from "../actions";

export const HIGHLIGHT_LINGER_MS = 2000;

function* clearAfterDelay(): SagaIterator {
  yield delay(HIGHLIGHT_LINGER_MS);
  yield put(clearHighlightedDownload());
}

export function* watchHighlightedDownload(): SagaIterator {
  yield takeLatest(SET_HIGHLIGHTED_DOWNLOAD, clearAfterDelay);
}
