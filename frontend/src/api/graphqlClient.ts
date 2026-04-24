import { GraphQLClient } from "graphql-request";
import { createClient } from "graphql-ws";

const GRAPHQL_HTTP_ENDPOINT = "http://localhost:5050/graphql";
const GRAPHQL_WS_ENDPOINT = "ws://localhost:5050/graphql";

export const graphqlClient = new GraphQLClient(GRAPHQL_HTTP_ENDPOINT);

export const getGraphqlWsClient = (): ReturnType<typeof createClient> =>
  createClient({ url: GRAPHQL_WS_ENDPOINT });
