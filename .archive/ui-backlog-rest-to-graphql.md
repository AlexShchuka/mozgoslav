# REST → GraphQL migration plan

```yaml
slug: rest-to-graphql
category: api
created: 2026-04-24
status: active
```

## Stack choice

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Backend schema | HotChocolate (v14) | First-class .NET 10 support, built-in subscriptions via Channels/Redis, no codegen friction |
| Frontend client | urql + graphql-codegen | Typed operations, smaller bundle than Apollo, works fine with Electron CSP `http://localhost:5050` |
| Coexistence bridge | RouteFilter middleware in `Program.cs` | New `/api/graphql` endpoint; old endpoints keep working until migrated |
| Auth header pass-through | `[Authorize]` on GraphQL endpoint (same bearer token) | Reuse existing ASP.NET auth; no new identity system |

## Phase 1 — Core types (shared contract)

**Goal:** One set of GraphQL types that both sides agree on. BE generates them; FE consumes via codegen.

| File (backend) | Type(s) |
|---|---|
| `Application/Types` (new folder) | `RecordingType`, `ProcessingJobType`, `TranscriptSegmentType`, `FinalTranscriptType`, `PartialTranscriptType` |
| Same file | `ProfileType`, `NoteType`, `FolderMappingType`, `VaultExportRuleType` |
| Same file | `SettingsSnapshotType`, `ModelDownloadResultType`, `CatalogEntryType` |
| Same file | `ObsidianDetectionType`, `ObsidianSetupReportType`, `VaultDiagnosticsReportType` |
| Same file | `HealthStatusType`, `RagQueryResultType` |

**Changes required:**
- Extract DTOs from domain entities (or use `IMapper` if already present; otherwise map inline in resolvers)
- Add `[GraphQL]` attributes to all shared types
- No breaking change — these types replace nothing yet

## Phase 2 — GraphQL endpoint scaffold

| File | Action |
|---|---|
| `Api/GraphQl/MozgoslavSchema.cs` | Create GraphQL schema, wire up DI from `IServiceProvider` |
| `Api/GraphQl/MozgoslavSchemaExtensions.cs` | Extension method for registration in DI |
| `Api/GraphQl/SubscriptionService.cs` | Thin wrapper around existing `Channel<T>` notifiers (jobs, devices, hotkeys) |
| `Api/GraphQl/Filters.cs` | Input type filters for Jobs, Recordings (pagination, status enums) |
| `Program.cs` | Add `app.UseGraphQL<MozgoslavSchema>(); app.MapGraphQL();` before old endpoints (so existing routes aren't shadowed) |

**New dependencies in .csproj:**
- `HotChocolate.AspNetCore`
- `HotChocolate.Types.Analyzers` (optional)

## Phase 3 — Resolvers per domain

### Jobs / Streaming (highest priority — biggest SSE migration)

| Resolver | GraphQL operation | Notes |
|---|---|---|
| `Query.jobs` | `[Job] jobs([FilterInput])` | Returns all + active count |
| `Query.jobsActive` | `[Job] jobsActive()` | Convenience shortcut |
| `Mutation.cancelJob` | `Boolean cancelJob(jobId: ID!)!` | Delegates to existing job cancellation |
| `Subscription.jobProgress` | `JobSSE jobProgress` | Subscription over existing `IChannel<Job>` from `ChannelJobProgressNotifier` |

### Recordings

| Resolver | GraphQL operation |
|---|---|
| `Query.recordings` | `[Recording] recordings([FilterInput])` |
| `Query.recording` | `Recording? recording(id: ID!)` |
| `Mutation.importRecording` | `ProcessingJob importRecording(files: [ID!]!)!` |
| `Mutation.reprocess` | `ProcessingJob reprocess(recordingId: ID!)!` |
| `Query.recordingNotes` | `[Note] recordingNotes(recordingId: ID!)!` |

### Notes

| Resolver | GraphQL operation |
|---|---|
| `Query.notes` | `[Note] notes([FilterInput])` |
| `Query.note` | `Note? note(id: ID!)` |
| `Mutation.createNote` | `Note createNote(input: NoteInput!): Note` |
| `Query.noteExport` | `String noteExport(id: ID!)!` |

### Obsidian (complex — external calls)

| Resolver | GraphQL operation |
|---|---|
| `Query.obsidianDetect` | `ObsidianDetection! obsidianDetect()` |
| `Mutation.obsidianSetup` | `ObsidianSetupReport obsidianSetup(path: String!)!` |
| `Mutation.obsidianExportAll` | `ObsidianBulkExportResult obsidianExportAll()` |
| `Mutation.obsidianApplyLayout` | `ObsidianApplyLayoutResult obsidianApplyLayout()` |
| `Query.obsidianDiagnostics` | `VaultDiagnosticsReport obsidianDiagnostics()` |
| `Mutation.obsidianReapplyBootstrap` | `ObsidianReapplyBootstrapResult obsidianReapplyBootstrap()` |
| `Mutation.obsidianReinstallPlugins` | `[PluginInstallResult] obsidianReinstallPlugins()` |

### Settings / Profile

| Resolver | GraphQL operation |
|---|---|
| `Query.settings` | `SettingsSnapshot settings()` |
| `Mutation.saveSettings` | `Boolean saveSettings(input: SettingsInput!)!` |
| `Query.profiles` | `[Profile] profiles()` |
| `Mutation.createProfile` | `Profile createProfile(input: ProfileInput!)!` |
| `Mutation.updateProfile` | `Profile updateProfile(id: ID!, input: ProfileInput!)!` |
| `Mutation.duplicateProfile` | `Profile duplicateProfile(id: ID!)!` |
| `Mutation.deleteProfile` | `Boolean deleteProfile(id: ID!)!` |

### Models, RAG, Meetily, Sync, Backup, Dictation, Health (fill in similarly)

## Phase 4 — Frontend integration

### a. `src/graphql/` (new folder)

| File | Content |
|---|---|
| `schema.graphql` | Downloaded from introspection at bootstrap (via codegen) |
| `generated/graphql.ts` | Auto-generated by graphql-codegen |
| `client.ts` | urql singleton with retry + error handling |
| `operations/` | All queries/mutations/subscriptions as `.graphql` files + typed hooks via codegen |
| `subscriptions/` | Job progress, device changes, hotkey events subscriptions using urql's subscription support |

### b. Replace API clients one-by-one (not all at once)

| Priority | Old client → New substitution |
|---|---|
| 1. `JobsApi` → urql subscription for jobs | Redux-Saga `watchJobsSagas` calls GraphQL subscription |
| 2. `SettingsApi` → urql query/mutation | Settings slice uses GraphQL resolver directly |
| 3. `ProfilesApi` → urql CRUD | Profiles slice uses GraphQL mutations |
| 4. `RecordingApi` → urql import/reprocess | Recording saga imports via GraphQL mutation, then subscribes to Job progress |
| 5. `ObsidianApi` → urql calls | Obsidian saga calls GraphQL resolvers (all external Obsidian REST is still on the BE side) |
| 6. `NotesApi` → urql CRUD | Notes pages use GraphQL queries/mutations |
| 7. `ModelsApi` → urql download/stream | Model download uses GraphQL query + SSE for streaming progress (or WebSocket) |
| 8. `RagApi` → urql query | RAG queries via GraphQL mutation |
| 9. `MeetilyApi` → urql import | Meetily import via GraphQL mutation |
| 10. `SyncApi` → urql calls | Sync status/events via GraphQL queries/subscription |
| 11. `BackupApi` → urql calls | Backup create via GraphQL mutation, download as file stream |
| 12. `DictationApi` → urql calls | Dictation starts/stops via GraphQL mutations, pushes via SSE (same as current PCM stream) |
| 13. `HealthApi` → urql query | Health check via GraphQL query (or keep polling if simpler) |
| 14. `LogsApi` → urql calls | Logs tail via GraphQL subscription (SSE) |
| 15. `MetaApi` → urql query | Meta info via GraphQL query |

### c. Redux-Saga migration pattern per slice

Each saga slice gets updated in-place:
- `yield put(action())` → unchanged (actions stay Redux actions)
- API call: change from `axiosInstance.get(API_ENDPOINTS.jobs)` to `client.query(ALL_JOBS_QUERY).toPromise()` (urql)
- Subscription: change from `EventSource(API_ENDPOINTS.jobsStream)` to `client.subscription(JOB_PROGRESS_SUB).subscribe(...)`
- The Redux action dispatch pattern stays the same — only the *source* of data changes

## Phase 5 — Cutover & cleanup

| Step | Action |
|---|---|
| 1 | Verify all FE slices working against GraphQL |
| 2 | Remove old REST endpoint registrations from `Program.cs` (comment out first, test, then delete) |
| 3 | Remove old API client files (keep as archive in `.archive/`) |
| 4 | Delete `BaseApi`, `ApiFactory` (no longer needed) |
| 5 | Remove unused constants from `constants/api.ts` |

## Risks & mitigations

| Risk | Impact | Mitigation |
|---|--------|-----------|
| SSE → GraphQL subscription mismatch on Electron's `http://localhost:5050` CSP | Users can't connect to subscriptions | Verify urql subscription works with HTTP SSE transport; fallback: keep SSE for streaming, GraphQL for queries/mutations |
| HotChocolate + .NET 10 compatibility | Build breaks | Pin version that supports net10.0; test early in Phase 2 |
| Large file downloads (model download, backup zip) via GraphQL | Payload size limits in hotchocolate | Use streaming resolvers (IAsyncEnumerable of byte chunks) for binary data |
| Backward compatibility during migration | FE broken while some endpoints still REST, others GraphQL | RouteFilter middleware ensures no conflict; test each migration in isolation |
| Subscription back-pressure (jobs stream many events) | Memory leak / lagging | GraphQL subscription has built-in buffer limits; configure `MaxExecutionCount` in HotChocolate |
| Obsidian REST plugin still needed (it's not our API) | No impact — Obsidian client calls remain in BE, only our REST→GraphQL switch matters |

## Dependencies & pre-requisites

- HotChocolate v14 is compatible with .NET 10
- Electron CSP needs `http://localhost:5050` for GraphQL (already in current config)
- No schema migrations needed — types come from Domain entities directly (no EF Core migration tool involved)
- No new permissions needed — GraphQL endpoint uses same bearer token auth as REST

## Files to create (summary)

**Backend:**
- `Api/GraphQl/MozgoslavSchema.cs` (new)
- `Api/GraphQl/MozgoslavSchemaExtensions.cs` (new)
- `Api/GraphQl/Filters.cs` (new)
- `Application/Types/*.cs` (new — all shared types in one file per domain cluster)
- `Application/GraphQlResolvers/JobsResolver.cs` (new)
- `Application/GraphQlResolvers/RecordingsResolver.cs` (new)
- `Application/GraphQlResolvers/ObsidianResolver.cs` (new)
- ... one resolver file per domain cluster

**Frontend:**
- `src/graphql/client.ts` (new)
- `src/graphql/generated/` (auto-generated by codegen — no hand-written files)
- `src/graphql/operations/*.graphql` (new)
- `src/graphql/subscriptions/*.graphql` (new — job progress, device changes, hotkeys)
