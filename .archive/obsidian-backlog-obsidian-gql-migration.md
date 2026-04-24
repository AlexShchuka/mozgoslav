---
id: obsidian-gql-migration
status: proposed
audience: agent
---

# obsidian-gql-migration

## context
Phase 12b/12c migrated every domain off REST except Obsidian. The Obsidian saga still calls `apiFactory.createObsidianApi()` against routes that no longer exist on the backend.

## problem
- `ApiFactory.ts`, `ObsidianApi.ts`, `BaseApi.ts`, and the `axios` dependency stay alive only because the obsidian saga uses them.
- Obsidian REST routes were removed in Phase 12a; obsidian gql resolvers exist only for `obsidianDetect` and `setupObsidian` (Phase 9).
- Five obsidian operations have no gql counterpart yet: `applyLayout`, `exportAll`, `diagnostics`, `reapplyBootstrap`, `reinstallPlugins`. Calling them from the renderer 404s.
- Diagnostics types were extracted to a local `apiTypes.ts`, and `axios.isAxiosError` was replaced with a generic `Error` check, but the actual transport is still REST.

## proposal
- Add the five missing operations to `backend/src/Mozgoslav.Api/GraphQL/Obsidian/`:
  - `Mutation.applyObsidianLayout(input)` — paired with the existing `IObsidianLayoutService`.
  - `Mutation.exportObsidianAll` — paired with `IObsidianExportService`.
  - `Query.obsidianDiagnostics` — paired with `IVaultDiagnostics`.
  - `Mutation.reapplyObsidianBootstrap` — paired with the bootstrap provider.
  - `Mutation.reinstallObsidianPlugins` — paired with `IPluginInstaller`.
- Each follows the established errors-as-data pattern: `{ result, errors: [IUserError!]! }`.
- Add resolver integration tests under `backend/tests/Mozgoslav.Tests.Graph/Obsidian/`.
- Frontend operations file gets the five new documents; codegen output regenerated and committed.
- Migrate the four obsidian sagas (`bulkExportSaga`, `diagnosticsSaga`, `reapplyBootstrapSaga`, `reinstallPluginsSaga`) plus `applyLayoutSaga` to `gqlRequest(...)` calls.
- Delete `ApiFactory.ts`, `ObsidianApi.ts`, `BaseApi.ts`. Drop `axios` from `frontend/package.json`. Run `npm install` to refresh the lockfile.
- Grep guard: `apiFactory|axios|from "../api/[A-Z]" ` over `src/` returns zero hits.

## acceptance
- [ ] All five obsidian operations exist as gql resolvers with passing tests.
- [ ] Obsidian sagas use `gqlRequest` exclusively; no `apiFactory` reference remains.
- [ ] `ApiFactory.ts`, `ObsidianApi.ts`, `BaseApi.ts` deleted.
- [ ] `axios` not in `frontend/package.json`.
- [ ] Schema snapshot updated; CI drift guard green.
- [ ] Obsidian e2e flow (detect → setup → apply layout → export → diagnostics) walks green.

## rejected
| alt | reason |
|---|---|
| Re-add a tiny REST adapter for obsidian only | reintroduces the surface we just removed. |
| Skip migration, mark obsidian as deprecated | obsidian is a first-class feature in the app shell. |
| Bundle the operations into one `Mutation.runObsidianAction(name, args)` | erases types and `IUserError` discrimination per branch. |
