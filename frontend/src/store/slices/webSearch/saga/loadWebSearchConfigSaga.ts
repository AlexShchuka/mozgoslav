import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { parse } from "graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  LOAD_WEB_SEARCH_CONFIG,
  loadWebSearchConfigFailure,
  loadWebSearchConfigSuccess,
} from "../actions";
import type { WebSearchConfig } from "../types";

const QueryWebSearchConfigDocument = parse(`
  query QueryWebSearchConfig {
    webSearchConfig {
      ddgEnabled
      yandexEnabled
      googleEnabled
      cacheTtlHours
      rawSettingsYaml
    }
  }
`);

interface QueryWebSearchConfigResult {
  webSearchConfig: WebSearchConfig;
}

export function* loadWebSearchConfigSaga(): SagaIterator {
  try {
    const data = (yield* gqlRequest(
      QueryWebSearchConfigDocument as Parameters<typeof gqlRequest>[0],
      {}
    )) as QueryWebSearchConfigResult;
    yield put(loadWebSearchConfigSuccess(data.webSearchConfig));
  } catch {
    yield put(loadWebSearchConfigFailure());
  }
}

export function* watchLoadWebSearchConfig(): SagaIterator {
  yield takeLatest(LOAD_WEB_SEARCH_CONFIG, loadWebSearchConfigSaga);
}
