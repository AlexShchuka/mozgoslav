# REST → GraphQL migration

Replace the current REST surface with a single GraphQL endpoint on the backend plus a matching client on the frontend. One schema as the contract, typed queries on the client, resolvers per domain on the backend. Streaming (SSE today for job progress, dictation, devices, sync, hotkey) moves to GraphQL subscriptions.

Scope includes choosing the stack (HotChocolate on the backend, graphql-codegen + urql/Apollo on the frontend), designing the schema per feature, and a migration order that lets REST and GraphQL coexist until every caller is cut over.
