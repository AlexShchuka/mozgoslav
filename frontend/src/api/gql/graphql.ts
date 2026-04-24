/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from "@graphql-typed-document-node/core";
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | { [P in keyof T]?: P extends " $fragmentName" | "__typename" ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export type HealthStatus = {
  __typename?: "HealthStatus";
  status: Scalars["String"]["output"];
  time: Scalars["String"]["output"];
};

export type LlmHealthStatus = {
  __typename?: "LlmHealthStatus";
  available: Scalars["Boolean"]["output"];
};

export type MetaInfo = {
  __typename?: "MetaInfo";
  assemblyVersion: Scalars["String"]["output"];
  buildDate: Scalars["String"]["output"];
  commit: Scalars["String"]["output"];
  version: Scalars["String"]["output"];
};

export type MutationType = {
  __typename?: "MutationType";
  placeholder: Scalars["Boolean"]["output"];
};

export type QueryType = {
  __typename?: "QueryType";
  health: HealthStatus;
  llmHealth: LlmHealthStatus;
  meta: MetaInfo;
};

export type SubscriptionType = {
  __typename?: "SubscriptionType";
  placeholder: Scalars["Boolean"]["output"];
};

export type QueryHealthQueryVariables = Exact<{ [key: string]: never }>;

export type QueryHealthQuery = {
  __typename?: "QueryType";
  health: { __typename?: "HealthStatus"; status: string; time: string };
};

export type QueryLlmHealthQueryVariables = Exact<{ [key: string]: never }>;

export type QueryLlmHealthQuery = {
  __typename?: "QueryType";
  llmHealth: { __typename?: "LlmHealthStatus"; available: boolean };
};

export type QueryMetaQueryVariables = Exact<{ [key: string]: never }>;

export type QueryMetaQuery = {
  __typename?: "QueryType";
  meta: {
    __typename?: "MetaInfo";
    version: string;
    assemblyVersion: string;
    commit: string;
    buildDate: string;
  };
};

export const QueryHealthDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryHealth" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "health" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "status" } },
                { kind: "Field", name: { kind: "Name", value: "time" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryHealthQuery, QueryHealthQueryVariables>;
export const QueryLlmHealthDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryLlmHealth" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "llmHealth" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "available" } }],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryLlmHealthQuery, QueryLlmHealthQueryVariables>;
export const QueryMetaDocument = {
  kind: "Document",
  definitions: [
    {
      kind: "OperationDefinition",
      operation: "query",
      name: { kind: "Name", value: "QueryMeta" },
      selectionSet: {
        kind: "SelectionSet",
        selections: [
          {
            kind: "Field",
            name: { kind: "Name", value: "meta" },
            selectionSet: {
              kind: "SelectionSet",
              selections: [
                { kind: "Field", name: { kind: "Name", value: "version" } },
                { kind: "Field", name: { kind: "Name", value: "assemblyVersion" } },
                { kind: "Field", name: { kind: "Name", value: "commit" } },
                { kind: "Field", name: { kind: "Name", value: "buildDate" } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode<QueryMetaQuery, QueryMetaQueryVariables>;
