import { put, takeEvery, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type {
  MutationCreatePromptTemplateMutation,
  MutationDeletePromptTemplateMutation,
  MutationUpdatePromptTemplateMutation,
  QueryPreviewPromptQuery,
  QueryPromptTemplatesQuery,
} from "../../../api/gql/graphql";
import {
  MutationCreatePromptTemplateDocument,
  MutationDeletePromptTemplateDocument,
  MutationUpdatePromptTemplateDocument,
  QueryPreviewPromptDocument,
  QueryPromptTemplatesDocument,
} from "../../../api/gql/graphql";
import { gqlRequest } from "../../saga/graphql";
import {
  CREATE_PROMPT,
  DELETE_PROMPT,
  LOAD_PROMPTS,
  PREVIEW_PROMPT,
  UPDATE_PROMPT,
  createPromptFailure,
  createPromptSuccess,
  deletePromptFailure,
  deletePromptSuccess,
  loadPromptsFailure,
  loadPromptsSuccess,
  previewPromptFailure,
  previewPromptSuccess,
  updatePromptFailure,
  updatePromptSuccess,
  type CreatePromptAction,
  type DeletePromptAction,
  type PreviewPromptAction,
  type UpdatePromptAction,
} from "./actions";

export function* loadPromptsSaga(): SagaIterator {
  try {
    const result = (yield* gqlRequest(QueryPromptTemplatesDocument, {})) as QueryPromptTemplatesQuery;
    const templates = (result.promptTemplates ?? []).map((t) => ({
      id: t.id as string,
      name: t.name,
      body: t.body,
      createdAt: t.createdAt as string,
    }));
    yield put(loadPromptsSuccess(templates));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(loadPromptsFailure(message));
  }
}

export function* createPromptSaga(action: CreatePromptAction): SagaIterator {
  const { name, body } = action.payload;
  try {
    const result = (yield* gqlRequest(MutationCreatePromptTemplateDocument, {
      name,
      body,
    })) as MutationCreatePromptTemplateMutation;
    const t = result.createPromptTemplate;
    yield put(createPromptSuccess({ id: t.id as string, name: t.name, body: t.body, createdAt: t.createdAt as string }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(createPromptFailure(message));
  }
}

export function* updatePromptSaga(action: UpdatePromptAction): SagaIterator {
  const { id, name, body } = action.payload;
  try {
    const result = (yield* gqlRequest(MutationUpdatePromptTemplateDocument, {
      id,
      name,
      body,
    })) as MutationUpdatePromptTemplateMutation;
    if (result.updatePromptTemplate) {
      const t = result.updatePromptTemplate;
      yield put(updatePromptSuccess({ id: t.id as string, name: t.name, body: t.body, createdAt: t.createdAt as string }));
    } else {
      yield put(updatePromptFailure("Template not found"));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(updatePromptFailure(message));
  }
}

export function* deletePromptSaga(action: DeletePromptAction): SagaIterator {
  const id = action.payload;
  try {
    const result = (yield* gqlRequest(MutationDeletePromptTemplateDocument, {
      id,
    })) as MutationDeletePromptTemplateMutation;
    if (result.deletePromptTemplate) {
      yield put(deletePromptSuccess(id));
    } else {
      yield put(deletePromptFailure("Template not found"));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(deletePromptFailure(message));
  }
}

export function* previewPromptSaga(action: PreviewPromptAction): SagaIterator {
  const { templateBody } = action.payload;
  try {
    const result = (yield* gqlRequest(QueryPreviewPromptDocument, {
      templateBody,
    })) as QueryPreviewPromptQuery;
    yield put(previewPromptSuccess(result.previewPrompt));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    yield put(previewPromptFailure(message));
  }
}

export function* watchPromptsSagas(): SagaIterator {
  yield takeLatest(LOAD_PROMPTS, loadPromptsSaga);
  yield takeEvery(CREATE_PROMPT, createPromptSaga);
  yield takeEvery(UPDATE_PROMPT, updatePromptSaga);
  yield takeEvery(DELETE_PROMPT, deletePromptSaga);
  yield takeLatest(PREVIEW_PROMPT, previewPromptSaga);
}
