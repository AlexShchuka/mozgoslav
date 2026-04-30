import { put, takeLatest } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";

import type { SuggestGlossaryTermsQuery } from "../../../../api/gql/graphql";
import { SuggestGlossaryTermsDocument } from "../../../../api/gql/graphql";
import { gqlRequest } from "../../../saga/graphql";
import {
  SUGGEST_GLOSSARY_TERMS,
  type SuggestGlossaryTermsAction,
  suggestGlossaryTermsFailure,
  suggestGlossaryTermsSuccess,
} from "../actions";

export function* suggestGlossaryTermsSaga(action: SuggestGlossaryTermsAction): SagaIterator {
  const { profileId, language } = action.payload;
  try {
    const result = (yield* gqlRequest(SuggestGlossaryTermsDocument, {
      profileId,
      language,
    })) as SuggestGlossaryTermsQuery;
    yield put(
      suggestGlossaryTermsSuccess(profileId, language, result.suggestGlossaryTerms as string[])
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    yield put(suggestGlossaryTermsFailure(profileId, language, message));
  }
}

export function* watchSuggestGlossaryTerms(): SagaIterator {
  yield takeLatest(SUGGEST_GLOSSARY_TERMS, suggestGlossaryTermsSaga);
}
