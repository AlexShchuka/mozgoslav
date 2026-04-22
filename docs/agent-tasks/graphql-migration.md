# Agent task — migrate Mozgoslav REST → GraphQL

**Audience:** an implementation agent (developer role). Not a human ADR. Treat this file as a linear checklist: execute top-to-bottom, commit per phase, do not skip phases.

**Status:** authoritative. This file is the single source of truth for the migration. If you discover something that contradicts it, STOP and report — do not improvise.

---

## 0. Meta

**Owner:** shuka
**Target branch:** `shuka/graphql-migration-2026-04-18` — created from `origin/main`.
**Commit mode:** commit per phase (phase numbers match commit subjects, see §Commit schema).
**No push. No MR.** Local commits only, unless the user instructs otherwise.
**Breaking changes are allowed** — Mozgoslav is pre-production, no external clients. REST endpoints are removed in the cutover phase.
**Quality bar:** best-practice only. Refuse mediocre work. If a phase cannot meet the bar, stop and report — do not ship a compromise.
**No scope expansion.** Do not refactor unrelated code. Do not touch `.archive/`. Do not update the roadmap.
**2-strike rule:** if the same step fails twice, stop, capture the full context (error, files touched, commands run), report, wait. Do not silent-retry a third time.
**Autonomy:** do not ask clarifying questions back. If something is ambiguous, pick the best default consistent with this brief and flag it as UNVERIFIED in the phase report.
**Always read first.** Before writing any file, read the existing code it touches. Before creating any symbol, `grep` for duplicates.
**Commands:** every `dotnet` invocation MUST include `-maxcpucount:1` (sandbox CPU rule from the root CLAUDE.md).

---

## 1. Scope

### 1.1 In scope

Every REST endpoint currently registered by `backend/src/Mozgoslav.Api/Program.cs` lines 400-416 + the `LogsController` MVC controller, replaced end-to-end by a single GraphQL endpoint at `POST /graphql` plus a WebSocket subscription endpoint at `ws://…/graphql` (same path, `graphql-ws` sub-protocol).

Exhaustive endpoint inventory (source: `backend/CLAUDE.md` + `Program.cs`):

```
HealthEndpoints          → Query.health, Query.llmHealth
MetaEndpoints            → Query.meta
SettingsEndpoints        → Query.settings, Mutation.updateSettings
ProfileEndpoints         → Query.profiles/profile, Mutation.createProfile/updateProfile/deleteProfile
ModelEndpoints           → Query.models, Mutation.downloadModel, Subscription.modelDownloadProgress
RecordingEndpoints       → Query.recordings (UsePaging), Query.recording, Mutation.importRecordings/uploadRecordings/reprocessRecording/startRecording/stopRecording
JobEndpoints             → Query.jobs (UsePaging) / activeJobs, Mutation.enqueueJob/cancelJob, Subscription.jobProgress  (SSE /api/jobs/stream retired)
NoteEndpoints            → Query.notes (UsePaging) / note, Mutation.exportNote
MeetilyEndpoints         → Mutation.importFromMeetily
ObsidianEndpoints        → Query.obsidianDetect, Mutation.setupObsidian
BackupEndpoints          → Query.backups, Mutation.createBackup
DictationEndpoints       → Query.dictationAudioCapabilities/…status, Mutation.dictationStart/stop/…, Subscription.dictationEvents (SSE retired), Subscription.audioDeviceChanged (/_internal/devices/changed internal POST stays), Subscription.hotkeyEvents
SyncEndpoints            → Query.syncStatus/syncHealth/syncPairingPayload, Mutation.acceptSyncDevice, Subscription.syncEvents (SSE /api/sync/events retired)
RagEndpoints             → Mutation.ragReindex, Query.ragQuery  (Rag query is a read with args; keep as Query. Reindex is a write → Mutation.)
LogsController  (MVC)    → Query.logs, Query.logTail(file, lines)
SseEndpoints             → fully removed; payloads re-emerge as GraphQL Subscriptions
```

### 1.2 Out of scope (do NOT touch)

- Electron main-process code beyond the single transport wiring update in `frontend/electron/main.ts` CSP (see §7.2).
- Python sidecar (`python-sidecar/`). It talks to the .NET backend, not to the renderer; nothing changes for it.
- Swift helper (`helpers/MozgoslavDictationHelper/`). It talks to the .NET backend via the Electron loopback bridge; the inbound `/_internal/devices/changed` POST stays REST.
- `.archive/` — never touch.
- Existing ADRs under `docs/adr/`. Do not rewrite them.
- `backend/tests/Mozgoslav.Tests/` unit tests for domain logic — unchanged unless they transitively call an endpoint (in which case update the test to call the resolver directly).

### 1.3 The one explicit REST survivor

`POST /_internal/devices/changed` (SseEndpoints.cs) is called by the Swift helper over the Electron loopback bridge. It stays REST to keep the helper contract stable. Only the outbound SSE that currently re-emits this payload to the renderer migrates to a GraphQL Subscription.

---

## 2. Tech decisions (fixed — do not relitigate)

| Concern | Decision | Rationale |
|---|---|---|
| Server library | **HotChocolate 14.x** (latest stable at migration time) — floating minor via `Directory.Packages.props` | Standard for .NET GraphQL. Code-first, strong DataLoader integration, native Relay support. |
| Approach | **Code-first** with descriptor classes (`ObjectType<T>` or `[ExtendObjectType(typeof(Query))]`) | Schema is emitted from types; snapshot test guards drift. Schema-first wins nothing for a single-backend single-client project. |
| Relay compliance | **Full** — `.AddGlobalObjectIdentification()` + `[Node]` + `NodeResolver` on every entity that surfaces in queries | Enables cursor pagination contracts, uniform `id` shape, future `node(id:)` lookups. |
| Pagination | **Cursor / Relay** everywhere (`[UsePaging(IncludeTotalCount = true, DefaultPageSize = 25, MaxPageSize = 200)]`) | Stable under concurrent writes; industry default for Connection types. |
| Batching | **DataLoader** via GreenDonut. One DataLoader per parent→many relation that surfaces in a resolver. `[DataLoader]` attribute style, not manual class inheritance, unless a scenario needs cache overrides. | Mandatory for N+1 protection. Tests MUST assert the batch is invoked once per resolver pass for multi-item queries. |
| Filtering / sorting | `[UseFiltering]` + `[UseSorting]` on list queries that power table UIs (recordings, jobs, notes). `[UseProjection]` on all EF-backed queries. | Standard HotChocolate. Projections are not optional — without them EF loads every column. |
| Mutations | **Relay-style errors as data.** Every mutation returns a typed payload `{ entity: T?, errors: [UserError!] }`. `UserError` is an interface with concrete types per error code. No `throw` for domain errors — throws reserved for infrastructure bugs. | Forces clients to handle failure explicitly; types stay sound. |
| Subscriptions | `HotChocolate.Subscriptions.InMemory` pub-sub. Transport: `graphql-ws` protocol over WebSocket on the same `/graphql` endpoint. | Localhost desktop — no need for Redis / WS-transport complexity. Modern spec, supported client-side by `graphql-ws`. |
| Auth | **None.** Mozgoslav binds Kestrel to localhost-only and has no user model. Do NOT add `[Authorize]`. Do NOT introduce JWT middleware. | Matches current REST; out of scope per ADR-009. |
| Validation | FluentValidation is NOT in the stack. Validate at resolver entry with `InputObjectType<T>` descriptor `.Directive(...)` or explicit guards returning `UserError`. | Keep it simple; don't add a package for 6 resolvers' worth of validation. |
| Schema snapshot | **Verify-based**: write the schema SDL to `schema.graphql` at repo root via a dedicated console command; a test compares the live schema's `Print()` output to the checked-in file. PR CI fails on drift. | Single-file artifact reviewers can diff. Verify framework is already familiar to the team style. |
| Client (frontend) | **`graphql-request` 7.x** as transport + **`@graphql-codegen/cli` 5.x** with `client-preset` for types/documents. Subscriptions via **`graphql-ws` 5.x**. | Smallest surface, zero cache layer (Redux is the state store). Works with redux-saga without adaptation. |
| TypeScript generated output | `frontend/src/api/gql/` — `graphql.ts`, `gql.ts`, `fragment-masking.ts` generated by `client-preset`. Checked into git (not regenerated per build in CI; regenerated only by `npm run codegen`). | Reviewable diffs; fewer CI moving parts. |
| Operations location | `frontend/src/api/operations/*.graphql` — one file per domain (recordings.graphql, notes.graphql, …). Documents named with an explicit prefix (`QueryRecordings`, `MutationImportRecordings`, …) to keep saga imports readable. | Separates wire contracts from TS code; codegen sees them first-class. |

Anything not in this table: pick the simplest thing that works and flag UNVERIFIED.

---

## 3. Pre-flight

```bash
cd /home/coder/workspace/mozgoslav
git fetch origin main
git checkout main
git reset --hard origin/main
git status                    # MUST be clean
git checkout -b shuka/graphql-migration-2026-04-18
```

Read (do not skip):

- `backend/CLAUDE.md`
- `frontend/CLAUDE.md`
- `CLAUDE.md` (root — `.archive/` is invisible)
- `backend/Directory.Packages.props` — learn the floating-version convention before adding any package
- `backend/src/Mozgoslav.Api/Program.cs` lines 400-416 — the current endpoint map (your removal target in §Phase 12)
- `backend/src/Mozgoslav.Api/Endpoints/SseEndpoints.cs` — understand the three current SSE channels before replacing them
- `frontend/src/api/index.ts` + `ApiFactory.ts` + one representative Api (e.g. `RecordingApi.ts`) — learn how sagas currently consume REST before rewiring them

If any of those reads reveal a material deviation from this document (e.g. a new endpoint added after 2026-04-18), STOP and report — do not silently extend scope.

---

## 4. Phase 0 — scaffolding (backend + frontend)

Commit subject: `feat(graphql): phase 0 — scaffold HotChocolate server + codegen client`

### 4.1 Backend packages

Add to `backend/Directory.Packages.props` (floating minors, same convention as existing entries):

```xml
<!-- GraphQL -->
<PackageVersion Include="HotChocolate.AspNetCore" Version="14.*" />
<PackageVersion Include="HotChocolate.Data" Version="14.*" />
<PackageVersion Include="HotChocolate.Data.EntityFramework" Version="14.*" />
<PackageVersion Include="HotChocolate.Subscriptions.InMemory" Version="14.*" />
<PackageVersion Include="GreenDonut.Selectors" Version="14.*" />

<!-- Schema snapshot -->
<PackageVersion Include="Verify.MSTest" Version="27.*" />
<PackageVersion Include="Verify.HotChocolate" Version="1.*" />
```

Reference them from `backend/src/Mozgoslav.Api/Mozgoslav.Api.csproj` (core GraphQL) and from the upcoming test project (verify packages — see §4.3).

If HotChocolate 15 is the current stable at execution time, pin to `15.*`. The `AddGlobalObjectIdentification`, `AddFiltering`, `AddSorting`, `AddProjections` API surface is stable across 14→15; any breaking difference MUST be flagged as UNVERIFIED.

### 4.2 Program.cs wiring

Create a new class `backend/src/Mozgoslav.Api/GraphQL/SchemaBuilderExtensions.cs`:

```csharp
namespace Mozgoslav.Api.GraphQL;

internal static class SchemaBuilderExtensions
{
    public static IServiceCollection AddMozgoslavGraphQL(this IServiceCollection services) =>
        services
            .AddGraphQLServer()
            .AddMozgoslavQueries()        // extension method per §Phase N
            .AddMozgoslavMutations()
            .AddMozgoslavSubscriptions()
            .AddMozgoslavTypes()
            .AddGlobalObjectIdentification()
            .AddFiltering()
            .AddSorting()
            .AddProjections()
            .AddInMemorySubscriptions()
            .ModifyOptions(o => o.StrictValidation = true)
            .ModifyPagingOptions(o =>
            {
                o.IncludeTotalCount = true;
                o.DefaultPageSize = 25;
                o.MaxPageSize = 200;
                o.RequirePagingBoundaries = false;  // allow omitted first/after; defaults to 25.
            })
            .ModifyRequestOptions(o => o.IncludeExceptionDetails = false)
            .Services;
}
```

In `Program.cs`:

- Add `builder.Services.AddMozgoslavGraphQL();` after the existing DI block, before `builder.Build()`.
- After `app.MapControllers();` but before the existing `app.MapXxxEndpoints()` calls, add:
  ```csharp
  app.MapGraphQL("/graphql");
  ```
- Do NOT remove any REST endpoint map yet — they coexist until Phase 12.

Create placeholder modules (empty but typed):

- `backend/src/Mozgoslav.Api/GraphQL/Queries/QueryType.cs` — `public sealed class QueryType { }`
- `backend/src/Mozgoslav.Api/GraphQL/Mutations/MutationType.cs` — `public sealed class MutationType { }`
- `backend/src/Mozgoslav.Api/GraphQL/Subscriptions/SubscriptionType.cs` — `public sealed class SubscriptionType { }`

Register them via the chained `AddMozgoslavQueries/Mutations/Subscriptions/Types` extension methods that each Phase will populate. Create one file per extension — one class per file (team convention from root CLAUDE.md).

### 4.3 Schema snapshot test project

Create `backend/tests/Mozgoslav.Tests.Schema/Mozgoslav.Tests.Schema.csproj` — MSTest + Verify.HotChocolate. Single test class `SchemaSnapshotTests` with one method `Schema_Matches_Snapshot`:

```csharp
[TestClass]
public sealed class SchemaSnapshotTests
{
    [TestMethod]
    public async Task Schema_Matches_Snapshot()
    {
        await using var factory = new WebApplicationFactory<Program>();
        using var scope = factory.Services.CreateScope();
        var executor = await scope.ServiceProvider
            .GetRequiredService<IRequestExecutorProvider>()
            .GetExecutorAsync();
        await Verify(executor.Schema.Print());
    }
}
```

Add the project to `Mozgoslav.sln`. Run once — the generated `SchemaSnapshotTests.Schema_Matches_Snapshot.verified.txt` becomes the baseline and MUST be committed alongside.

Re-export the SDL on every schema change: either run the test and check in the diff, or add a console command `dotnet run --project backend/src/Mozgoslav.Api -- export-schema ../../../schema.graphql` that HotChocolate's `ISchema.Print()` feeds. Prefer the console command: the root `schema.graphql` is the artifact a PR reviewer reads.

### 4.4 Frontend packages

```bash
cd frontend
npm install --save graphql graphql-request graphql-ws
npm install --save-dev @graphql-codegen/cli @graphql-codegen/client-preset @parcel/watcher
```

Add `frontend/codegen.ts`:

```typescript
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "../schema.graphql",
  documents: ["src/api/operations/**/*.graphql"],
  generates: {
    "src/api/gql/": {
      preset: "client",
      config: {
        useTypeImports: true,
        scalars: { DateTime: "string", Guid: "string", UUID: "string" },
      },
    },
  },
  hooks: { afterAllFileWrite: ["prettier --write"] },
};

export default config;
```

Add npm scripts to `frontend/package.json`:

```json
{
  "scripts": {
    "codegen": "graphql-codegen --config codegen.ts",
    "codegen:watch": "graphql-codegen --config codegen.ts --watch"
  }
}
```

Do NOT run codegen yet — no operations exist. A stub `frontend/src/api/operations/.gitkeep` lets the preset not explode.

### 4.5 Shared GraphQL client module

Create `frontend/src/api/graphqlClient.ts`:

```typescript
import { GraphQLClient } from "graphql-request";
import { createClient, type Client as WsClient } from "graphql-ws";

const HTTP_URL = "http://localhost:5050/graphql";
const WS_URL = "ws://localhost:5050/graphql";

export const graphqlClient = new GraphQLClient(HTTP_URL, {
  credentials: "same-origin",
});

let wsClient: WsClient | null = null;
export const getGraphqlWsClient = (): WsClient => {
  if (!wsClient) {
    wsClient = createClient({ url: WS_URL, lazy: true });
  }
  return wsClient;
};
```

Why a lazy WS client: opening a socket at boot for features the user may never use burns a file descriptor and muddies logs. Lazy-init at first subscribe.

### 4.6 Saga helpers

Create `frontend/src/store/saga/graphql.ts`:

```typescript
import { eventChannel, type EventChannel } from "redux-saga";
import { call } from "redux-saga/effects";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import { graphqlClient, getGraphqlWsClient } from "../../api/graphqlClient";

export function* gqlRequest<TResult, TVariables>(
  doc: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables,
): Generator<unknown, TResult, TResult> {
  return (yield call([graphqlClient, "request"], doc, variables as Record<string, unknown>)) as TResult;
}

export const gqlSubscriptionChannel = <TResult, TVariables>(
  doc: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables,
): EventChannel<TResult> =>
  eventChannel<TResult>((emit) => {
    const unsubscribe = getGraphqlWsClient().subscribe<TResult>(
      { query: doc.loc?.source.body ?? "", variables: variables as Record<string, unknown> },
      {
        next: (value) => {
          if (value.data) emit(value.data as TResult);
        },
        error: (err) => emit(err as unknown as TResult),
        complete: () => {},
      },
    );
    return () => unsubscribe();
  });
```

Sagas consume queries/mutations as `yield* gqlRequest(document, variables)` and subscriptions by `const channel = yield call(gqlSubscriptionChannel, document, variables); while (true) { const event = yield take(channel); … }`. This is the ONLY sanctioned way resolvers appear in saga code — no raw `fetch`, no raw WebSocket.

### 4.7 CSP allowance

`frontend/electron/main.ts` currently sets CSP `connect-src 'self' localhost:5050 localhost:5173`. Append `ws://localhost:5050 ws://127.0.0.1:5050` to `connect-src`. Do NOT widen anything else.

### 4.8 Phase 0 tests

- Backend: `SchemaSnapshotTests.Schema_Matches_Snapshot` passes against an empty-ish schema (just the HotChocolate scaffolding + `Query.node(id:ID)` stub from `AddGlobalObjectIdentification`).
- Frontend: `npm run typecheck` + `npm run lint` green.

If they are not green before the commit, fix first. No red commits on this branch.

**Phase 0 exit criteria:** `/graphql` returns `{ "data": { "__typename": "Query" } }` for `{ __typename }`; SDL snapshot committed; frontend builds with the new deps.

---

## 5. Phase 1..N — per-domain migrations

The template below applies to every domain phase. Follow it literally.

### 5.1 Phase template

For each domain (Phases 1–11 below, ordered for dependency minimisation):

1. **Read first.**
   - The existing endpoint file under `backend/src/Mozgoslav.Api/Endpoints/{Domain}Endpoints.cs`.
   - The corresponding repository interface in `backend/src/Mozgoslav.Application/Interfaces/`.
   - The domain entity / DTO types in `backend/src/Mozgoslav.Domain/`.
   - The frontend `{Domain}Api.ts` + any saga that calls it (grep for `{domain}Api` across `frontend/src/store/`).

2. **Write the SDL fragment** conceptually (as a comment in your head, or on scratch paper). You are aiming for GraphQL types that mirror the existing REST DTOs but:
   - Use `ID!` instead of `string` for opaque identifiers (GlobalID shape).
   - Use `DateTime!` (ISO-8601) scalar (HotChocolate default).
   - Use typed enums, not stringly.
   - Use Connection types for lists that could grow (anything returning more than ~50 items in production).

3. **Write the C# schema extension** under `backend/src/Mozgoslav.Api/GraphQL/{Domain}/`:
   - `{Domain}QueryType.cs` — `[ExtendObjectType<QueryType>]` class with query resolvers.
   - `{Domain}MutationType.cs` — same for mutations.
   - `{Domain}SubscriptionType.cs` if this domain emits subscriptions.
   - `{Domain}ObjectType.cs` — `ObjectType<TEntity>` descriptors: `[Node]` attribute, `NodeResolver`, `UseFiltering/UseSorting/UseProjection` on list fields, DataLoader wiring for children.
   - Register via `SchemaBuilderExtensions.AddMozgoslav{Queries|Mutations|Subscriptions|Types}` one line added per type.

4. **DataLoaders.** For every N+1 surface, add `backend/src/Mozgoslav.Api/GraphQL/{Domain}/{Child}ByParentDataLoader.cs`:

   ```csharp
   [DataLoader]
   internal static async Task<IReadOnlyDictionary<Guid, IReadOnlyList<ProcessedNote>>> NotesByRecordingIdAsync(
       IReadOnlyList<Guid> recordingIds,
       IProcessedNoteRepository repo,
       CancellationToken ct)
   {
       var notes = await repo.GetByRecordingIdsAsync(recordingIds, ct);
       return notes.GroupBy(n => n.RecordingId)
                   .ToDictionary(g => g.Key, g => (IReadOnlyList<ProcessedNote>)g.ToList());
   }
   ```

   If the repository does not expose a batch method for the relation, ADD ONE on the interface and a concrete EF implementation — one new batch method per DataLoader. No per-row loops. No hidden `ToListAsync` inside a loader body.

5. **Mutation payloads.** Every mutation input/output lives in `backend/src/Mozgoslav.Api/GraphQL/{Domain}/Inputs/` and `/Payloads/`. Payload shape:

   ```csharp
   public sealed record UpdateSettingsPayload(AppSettings? settings, IReadOnlyList<UserError> errors);
   ```

   `UserError` interface + per-code concrete records (e.g. `ValidationError`, `NotFoundError`, `ConflictError`) — define once in `GraphQL/Errors/` and reuse. NEVER throw for expected domain failures; map them to `errors: [...]`.

6. **Write tests first.** Under `backend/tests/Mozgoslav.Tests.Graph/` (new project — create in Phase 0; this task needs to happen in Phase 0, fix if missed):

   - Resolver integration tests that spin the full `WebApplicationFactory<Program>` + real `MozgoslavDbContext` using `EfInMemory` (already wired in existing integration-test infra — reuse).
   - One test per query shape (zero results, one result, paged, invalid cursor).
   - One test per mutation (success, each `UserError` branch, idempotency if relevant).
   - DataLoader batch test: query a list of parents with child field, assert the repo's batch method is called ONCE (use `NSubstitute.Received(1)`).

7. **Write documents.** Under `frontend/src/api/operations/{domain}.graphql`. One file per domain. Import fragments from a shared `_fragments.graphql`.

8. **Run codegen.** `npm run codegen` inside `frontend/`. Commit the regenerated `src/api/gql/**` files.

9. **Rewire sagas.** Replace `yield call([recordingApi, "getAll"])` with `yield* gqlRequest(QueryRecordingsDocument, { first: 25 })`. Do NOT delete the old `*Api.ts` yet — wait for Phase 12. Reason: if the saga path breaks, you can temporarily route through the old class while debugging. (In practice the `*Api.ts` files never re-enter the dependency graph once sagas move; they just sit dead until Phase 12 deletes them.)

10. **Update the schema snapshot.** Run the backend test — Verify will produce a `.received.txt`; compare, approve, commit. Also regenerate the root `schema.graphql` via the export command.

11. **Verify.** `dotnet test -maxcpucount:1 backend/` (scoped to the touched projects is fine, but final Phase 12 runs the full suite). `npm test && npm run typecheck && npm run lint` in `frontend/`.

12. **Commit.** One commit per phase. Subject format: `feat(graphql): phase N — {domain}`. Body describes the endpoint set migrated.

### 5.2 Phase order

Phases are ordered so each later phase can freely depend on types registered by earlier phases.

| Phase | Domain(s) | Notes |
|---|---|---|
| 1 | Health + Meta | Smallest surface. Warms up QueryType + tests. |
| 2 | Settings | Pure CRUD on `AppSettings` — establishes the UserError pattern. |
| 3 | Profiles | First entity with `[Node]` + `NodeResolver`. Template for all entities. |
| 4 | Models | Download mutation + `Subscription.modelDownloadProgress` (piggy-backs on existing `IModelDownloadCoordinator`). First subscription — establishes the `ITopicEventSender`/`ITopicEventReceiver` pattern. |
| 5 | Recordings | First paginated query. Establishes Connection, cursor encoding, `[UsePaging]` + `[UseFiltering]` + `[UseSorting]` + DataLoader for child notes. Complex mutation set (import-by-paths, upload multipart, start/stop native session, reprocess). |
| 6 | Notes | Second paginated query; depends on Recording's Node type for `recording` field. Export mutation. |
| 7 | Jobs | Paginated query + `Subscription.jobProgress` (retires `IJobProgressNotifier`'s SSE path; keep the in-process Channel<T> and bridge it to `ITopicEventSender` at the notifier boundary). Cancellation mutation (ADR-015). |
| 8 | Dictation | Three subscriptions (events, audio-device-changed, hotkey-events). Retires `GET /api/sync/events` path for dictation channels in `SseEndpoints.cs`. |
| 9 | Obsidian + Meetily + Backup | Small. Obsidian detect query + setup mutation. Meetily import mutation. Backup list + create. Grouped to keep phase count sane. |
| 10 | Rag | Reindex mutation + query mutation (query-with-arguments stays `Query.ragQuery` because it is read-only; reindex is a `Mutation`). |
| 11 | Sync | Status + health + pairing-payload queries. `acceptSyncDevice` mutation. `Subscription.syncEvents` replaces the SSE bridge. |
| 12 | Cutover | See §6. |

Every phase MUST meet the exit criteria in §5.1 before the next begins.

### 5.3 Phase 4 subscription wiring — reference pattern

Because subscriptions are new territory, here is the exact wire-up that Phase 4 establishes. Phases 7, 8, 11 reuse it.

Backend — a notifier that already uses `Channel<T>` keeps its interface. Adapter:

```csharp
internal sealed class GraphQLModelDownloadBridge : IHostedService
{
    private readonly IModelDownloadCoordinator _coordinator;
    private readonly ITopicEventSender _sender;
    // ... constructor / cancellation token ...

    public async Task StartAsync(CancellationToken ct)
    {
        _ = Task.Run(async () =>
        {
            await foreach (var evt in _coordinator.ReadAllAsync(ct))
            {
                await _sender.SendAsync("model-download", evt, ct);
            }
        }, ct);
    }
}
```

Subscription type:

```csharp
[ExtendObjectType<SubscriptionType>]
public sealed class ModelSubscriptionType
{
    [Subscribe(With = nameof(SubscribeToModelDownload))]
    public ModelDownloadEvent OnModelDownloadProgress([EventMessage] ModelDownloadEvent evt) => evt;

    public ValueTask<ISourceStream<ModelDownloadEvent>> SubscribeToModelDownload(
        [Service] ITopicEventReceiver receiver,
        CancellationToken ct) =>
        receiver.SubscribeAsync<ModelDownloadEvent>("model-download", ct);
}
```

Frontend:

```typescript
const OnModelDownloadProgressDocument = graphql(/* GraphQL */ `
  subscription OnModelDownloadProgress {
    modelDownloadProgress { downloadId, modelId, bytesDownloaded, totalBytes, stage, error }
  }
`);

function* watchModelDownload(): Generator { /* eventChannel → put(actionCreator(evt)) */ }
```

The existing SSE consumer in `frontend/src/features/Models/` — remove its fetch-based `EventSource` block and replace with the saga wired as in §4.6. Do this during the Phase, not later.

### 5.4 Error model — the full list

Define once in Phase 2 (because Settings is the first mutation), reuse afterwards.

```csharp
public interface IUserError { string Code { get; } string Message { get; } }
public sealed record ValidationError(string Code, string Message, string Field) : IUserError;
public sealed record NotFoundError(string Code, string Message, string ResourceKind, string ResourceId) : IUserError;
public sealed record ConflictError(string Code, string Message) : IUserError;
public sealed record UnavailableError(string Code, string Message) : IUserError;  // e.g. LLM endpoint down, model missing
```

Register `IUserError` as a GraphQL interface with the concrete implementations as member types. Every mutation payload's `errors` field is `[IUserError!]!` (non-null list of non-null interface).

SOLID reminder (per team convention): resolvers do NOT hard-code specific error concrete types when they could accept the interface. Generic handler code that surfaces errors accepts `IUserError` — not specific records. (Memory rule #solid_in_generic_handlers.)

---

## 6. Phase 12 — cutover

Commit subject: `feat(graphql): phase 12 — cutover (remove REST, delete Api classes)`

### 6.1 Backend removals

Delete every `backend/src/Mozgoslav.Api/Endpoints/*.cs` except the scaffolding hooks still needed by GraphQL. Concretely:

- Delete: `Backup, Dictation, Health, Job, Meetily, Meta, Model, Note, Obsidian, Profile, Rag, Recording, Sync, Settings` endpoint files.
- Delete: `SseEndpoints.cs` ENTIRELY after removing the three migrated SSE routes. **Keep** the inbound `POST /_internal/devices/changed` route; extract it into a new `backend/src/Mozgoslav.Api/Endpoints/InternalEndpoints.cs` file that exposes ONLY this one route (Swift-helper contract; §1.3).
- Delete: `backend/src/Mozgoslav.Api/Controllers/LogsController.cs` (logs queries now live in `LogsQueryType.cs` from Phase 9 — check — actually Phase should migrate logs. Add logs to Phase 9 if not already. If it ended up elsewhere, adjust). Also remove `builder.Services.AddControllers()` and `app.MapControllers()` from `Program.cs` — no controllers remain once Logs is gone.
- Remove from `Program.cs` lines 402-416 every `app.MapXxxEndpoints()` call whose endpoints were migrated. Add `app.MapInternalEndpoints()` for the preserved internal device-change route.

Search for stale references: `grep -r "api/recordings" backend/src` should return zero hits after this phase. Same for every migrated route prefix.

### 6.2 Frontend removals

- Delete `frontend/src/api/*Api.ts` (all 14 files) EXCEPT `BaseApi.ts`. Delete `ApiFactory.ts`. Delete `index.ts` re-exports for them.
  - If the electron main process or renderer imports anything still surviving through `BaseApi.ts`, delete `BaseApi.ts` too — grep first.
  - Delete `frontend/src/constants/api.ts` (`API_ENDPOINTS` no longer has consumers).
- Remove `axios` from `package.json` dependencies. Run `npm prune`.
- Any saga or component that still referenced a `*Api.ts` instance must already have been migrated in its domain phase; Phase 12 only deletes dead files. If a reference is still live, Phase N was incomplete — STOP, return to Phase N, fix, then retry Phase 12.

### 6.3 Verification

```bash
cd /home/coder/workspace/mozgoslav
dotnet test -maxcpucount:1                         # full backend suite
cd frontend && npm run typecheck && npm run lint && npm test   # full frontend suite
cd .. && dotnet run --project backend/src/Mozgoslav.Api -- export-schema schema.graphql
git diff --exit-code schema.graphql                # snapshot MUST be stable
grep -r "api/recordings\|api/jobs\|api/notes\|api/settings\|api/profiles\|api/models\|api/obsidian\|api/meetily\|api/backup\|api/dictation\|api/sync\|api/rag\|api/logs\|api/health" backend/src frontend/src
# grep MUST return zero hits. `/_internal/devices/changed` stays.
```

All green = phase complete.

---

## 7. Phase 13 — CI + schema drift guard (final)

Commit subject: `ci(graphql): schema drift guard + codegen verification`

### 7.1 Backend CI

Add a CI step (in whichever workflow already runs `dotnet test`) that runs the schema-export command and `git diff --exit-code schema.graphql`. If the SDL drifted without a corresponding commit, CI fails. READ the existing CI files under `.github/workflows/` first — this ADR does not prescribe a workflow name.

### 7.2 Frontend CI

Add:

```yaml
- run: npm run codegen
- run: git diff --exit-code src/api/gql
```

So a changed operation that was not accompanied by a regenerated `gql/` commit fails CI. This is cheap insurance against stale types slipping in.

### 7.3 Snapshot baseline review

When the final `schema.graphql` is committed, LAST step before pushing (if/when the user asks for push): scroll through it. Look for:

- Accidental leakage of internal fields (database primary keys that should have been mapped to GlobalID).
- Missing `@deprecated` on fields that exist only for backward compat (shouldn't be any — breaking changes allowed — but check).
- Missing `UserError` implementations in the schema — every concrete error type registered in `SchemaBuilderExtensions` should appear.

If anything looks off: flag UNVERIFIED, do not silently ship.

---

## 8. Commit schema

One commit per phase. Conventional Commits, match the existing `git log --oneline -30` style.

```
feat(graphql): phase 0 — scaffold HotChocolate server + codegen client
feat(graphql): phase 1 — health + meta
feat(graphql): phase 2 — settings + UserError model
feat(graphql): phase 3 — profiles
feat(graphql): phase 4 — models + modelDownloadProgress subscription
feat(graphql): phase 5 — recordings (pagination + DataLoaders)
feat(graphql): phase 6 — notes (pagination + export mutation)
feat(graphql): phase 7 — jobs + jobProgress subscription
feat(graphql): phase 8 — dictation subscriptions
feat(graphql): phase 9 — obsidian + meetily + backup + logs
feat(graphql): phase 10 — rag (query + reindex)
feat(graphql): phase 11 — sync + syncEvents subscription
feat(graphql): phase 12 — cutover (remove REST, delete Api classes)
ci(graphql): phase 13 — schema drift guard + codegen verification
```

Each commit message body: list files added / modified / deleted, and the test counts that passed on that phase. Keep it terse. Do NOT include emoji. Do NOT include Co-Authored-By unless the user asks.

---

## 9. Verification checklist (enforced at each phase boundary)

Before every commit:

- [ ] `dotnet build -maxcpucount:1` passes with zero warnings on new code (existing warnings OK).
- [ ] `dotnet test -maxcpucount:1` — all tests green. New tests for this phase exist and cover success + every error branch.
- [ ] `npm run typecheck` green.
- [ ] `npm run lint` green.
- [ ] `npm test` green.
- [ ] `schema.graphql` at repo root reflects the live SDL (re-exported via the console command).
- [ ] `SchemaSnapshotTests.Schema_Matches_Snapshot` verified and approved.
- [ ] Generated `frontend/src/api/gql/**` committed.
- [ ] No `*Api.ts` deletion happened (that is Phase 12 only).
- [ ] No push, no MR, no main/master touched.

If ANY box is unchecked: phase is not done. Do not commit.

---

## 10. Report

After each phase commit, append to `/home/coder/workspace/mozgoslav-graphql-report-<short-id>.md`:

- Phase number + SHA.
- Files added / modified / deleted (full paths).
- Test counts (backend passed/failed/skipped; frontend the same).
- DataLoader count added this phase.
- Subscription topics added this phase.
- UNVERIFIED items with reasoning.

After Phase 13: end the report with a top-level summary: total commits, total DataLoaders, total subscriptions, total resolver tests, schema line count. Path to the report is the last thing you tell the user.

---

## 11. What you MUST NOT do

- NEVER push to remote. No `git push`.
- NEVER open an MR. No `glab`. No `gh`.
- NEVER touch `main` or `master`. You work exclusively on `shuka/graphql-migration-2026-04-18`.
- NEVER use `--force`, `--no-verify`, `-c commit.gpgsign=false`, or any hook-skip.
- NEVER collapse multiple phases into one commit. One phase = one commit. If you need to split a phase, add `phase N.a` / `phase N.b` — never merge.
- NEVER skip DataLoader for a list→detail relation. N+1 in an EF-backed resolver is a defect.
- NEVER use field resolvers that bypass `[UseProjection]` on EF data.
- NEVER throw from a mutation for an expected domain failure. Map to `UserError`.
- NEVER expand scope ("while I'm here…"). If you discover an unrelated bug, open a note in the report, do not fix.
- NEVER touch `.archive/`, `docs/adr/`, `docs/POSTRELEASE.md`, or the roadmap.
- NEVER ask the user clarifying questions mid-execution. Pick the best default, document as UNVERIFIED.
- NEVER delete `*Api.ts` before Phase 12.
- NEVER add auth, JWT, or `[Authorize]`. Out of scope; Mozgoslav is localhost-only.

---

## 12. Tools & skills

You have full sandbox access. Recommended pattern per phase:

1. READ the existing endpoint + repository + frontend Api + sagas that touch it.
2. SEARCH for existing types before creating new ones (`grep -r "class Foo" backend/src`).
3. Write tests first (backend integration + DataLoader assertion; frontend saga tests if they grew).
4. Write the types, resolvers, DataLoaders.
5. Run the full verification checklist.
6. Re-export schema + regenerate frontend codegen.
7. Commit.

No per-file build loops. Write the whole phase, then run `dotnet build` once + `npm run typecheck` once. Rapid per-file cycles waste CPU in the sandbox (1-core cap).

If this document conflicts with anything in `backend/CLAUDE.md` / `frontend/CLAUDE.md` / root `CLAUDE.md`: THIS document wins for the migration scope. Outside the migration, the CLAUDE.md files remain authoritative.

Ship it clean.
