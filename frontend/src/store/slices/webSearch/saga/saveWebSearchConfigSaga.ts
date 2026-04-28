import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import { parse } from "graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  SAVE_WEB_SEARCH_CONFIG,
  type SaveWebSearchConfigAction,
  saveWebSearchConfigFailure,
  saveWebSearchConfigSuccess,
} from "../actions";
import type { WebSearchConfig } from "../types";

const MutationUpdateWebSearchConfigDocument = parse(`
  mutation MutationUpdateWebSearchConfig($input: WebSearchConfigInput!) {
    updateWebSearchConfig(input: $input) {
      config {
        ddgEnabled
        yandexEnabled
        googleEnabled
        cacheTtlHours
        rawSettingsYaml
      }
      errors {
        code
        message
      }
    }
  }
`);

interface MutationUpdateWebSearchConfigResult {
  updateWebSearchConfig: {
    config: WebSearchConfig | null;
    errors: Array<{ code: string; message: string }>;
  };
}

export function* saveWebSearchConfigSaga(action: SaveWebSearchConfigAction): SagaIterator {
  try {
    const data = (yield* gqlRequest(
      MutationUpdateWebSearchConfigDocument as Parameters<typeof gqlRequest>[0],
      { input: action.payload }
    )) as MutationUpdateWebSearchConfigResult;

    const config = data.updateWebSearchConfig.config;
    if (config) {
      yield put(saveWebSearchConfigSuccess(config));
    } else {
      yield put(saveWebSearchConfigFailure());
    }
  } catch {
    yield put(saveWebSearchConfigFailure());
  }
}

export function* watchSaveWebSearchConfig(): SagaIterator {
  yield takeLatest(SAVE_WEB_SEARCH_CONFIG, saveWebSearchConfigSaga);
}
