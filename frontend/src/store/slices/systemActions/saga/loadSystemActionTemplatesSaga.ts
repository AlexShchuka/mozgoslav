import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { QuerySystemActionTemplatesQuery } from "../../../../api/gql/graphql";
import { QuerySystemActionTemplatesDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  LOAD_SYSTEM_ACTION_TEMPLATES,
  loadSystemActionTemplatesFailure,
  loadSystemActionTemplatesSuccess,
} from "../actions";

function* loadSystemActionTemplatesSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(
      QuerySystemActionTemplatesDocument,
      {}
    )) as QuerySystemActionTemplatesQuery;

    type TemplateDto = QuerySystemActionTemplatesQuery["systemActionTemplates"][number];
    yield put(
      loadSystemActionTemplatesSuccess(
        result.systemActionTemplates.map((t: TemplateDto) => ({
          name: t.name,
          description: t.description,
          deeplinkUrl: t.deeplinkUrl,
        }))
      )
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(loadSystemActionTemplatesFailure(message));
  }
}

export function* watchLoadSystemActionTemplates(): SagaIterator {
  yield takeLatest(LOAD_SYSTEM_ACTION_TEMPLATES, loadSystemActionTemplatesSaga);
}
