import { call } from "redux-saga/effects";
import type { SagaIterator } from "redux-saga";
import { eventChannel } from "redux-saga";
import type { EventChannel } from "redux-saga";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import type { Variables } from "graphql-request";
import { print } from "graphql";
import { graphqlClient, getGraphqlWsClient } from "../../api/graphqlClient";

export function* gqlRequest<TResult extends object, TVariables extends Variables>(
  doc: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables
): SagaIterator<TResult> {
  const result: TResult = yield call(
    () => graphqlClient.request<TResult>({ document: doc, variables: variables as Variables })
  );
  return result;
}

export function gqlSubscriptionChannel<
  TResult extends object,
  TVariables extends Record<string, unknown>
>(
  doc: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables
): EventChannel<TResult> {
  return eventChannel<TResult>((emit) => {
    const wsClient = getGraphqlWsClient();
    const unsubscribe = wsClient.subscribe<TResult>(
      { query: print(doc), variables },
      {
        next: (value) => {
          if (value.data) {
            emit(value.data);
          }
        },
        error: () => {
          void wsClient.dispose();
        },
        complete: () => {
          void wsClient.dispose();
        },
      }
    );
    return () => {
      unsubscribe();
      void wsClient.dispose();
    };
  });
}
