# ADR-007 — Phase 2 Backend Agent

Read first: `ADR-007.md`, `ADR-007-shared.md` (API contract §2 is your binding target), `backend/CLAUDE.md`, root
`CLAUDE.md`. Precondition: **Phase 1 Agent A acceptance passed**.

Backend agent owns backend (C#) code for MR C (RAG), MR B (UX backends), MR D (Syncthing), MR E (Dictation reliability).
Runs in parallel with Frontend, Python, Swift agents. Works in `backend/src/` and `backend/tests/` only — frontend,
electron, python and swift source is read-only for this agent.

---

## 0. Goal and definition of done

**Goal.** Every backend BC owned by Phase 2 passes its test green; every corresponding bug in ADR-007 §5 is closed; the
API contract in `ADR-007-shared.md §2` is fully served; no stub `NotYetWired*` class remains in the code.

**DoD commands.**

```bash
cd /home/coder/workspace/mozgoslav-20260417/mozgoslav
dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1
dotnet test  backend/Mozgoslav.sln -maxcpucount:1 --no-restore
```

Both zero-error, all tests green. Startup run:

```bash
dotnet run --project backend/src/Mozgoslav.Api --no-build
# In another shell — smoke curls:
curl -X POST localhost:5050/api/rag/reindex
curl -X POST localhost:5050/api/rag/query -H "Content-Type: application/json" \
  -d '{"question":"ping","topK":3}'
curl localhost:5050/api/sync/status
curl localhost:5050/api/sync/health
curl -X POST localhost:5050/api/notes -H "Content-Type: application/json" \
  -d '{"title":"smoke"}'
curl -X POST localhost:5050/api/obsidian/export-all
curl -X POST localhost:5050/api/profiles/<built-in-id>/duplicate
curl "localhost:5050/api/models/scan?dir=$(pwd)"
```

All 202 / 200 per the contract.

---

## 1. Scope

| MR                  | Order | BCs                                                                                                                                                                                       | Bugs                                                  | Main deliverables                                                                                                                                                                               |
|---------------------|-------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **C** (RAG)         | 1st   | BC-039 (backend), BC-013 (verify)                                                                                                                                                         | 5, 17                                                 | Restore `IRagService` + `sqlite-vec` + sidecar client + endpoints per `ADR-007-shared.md §2.4`. Replace `NotYetWired*` stubs.                                                                   |
| **B** (UX backends) | 2nd   | BC-017, BC-021, BC-022 (backend), BC-024 (verify), BC-025 (backend), BC-028 (verify), BC-029, BC-031 (verify), BC-041 (no backend work — Frontend owns), BC-044 (verify), BC-045 (verify) | 4, 21, 22, 26 (backend done in Phase 1; nothing here) | Transcript checkpoint column + resume; manual note endpoint; Obsidian export-all + apply-layout; profile duplicate endpoint; `FolderMapping` + `VaultExportRule` domain entities.               |
| **D** (Syncthing)   | 3rd   | BC-048, BC-049                                                                                                                                                                            | 6 (full fix), 23 (backend portion)                    | `SyncthingLifecycleService` + random port + API-key; restore `SyncthingConfigService`, `SyncthingFolderInitializer`, `SyncthingSseEventParser`, `SyncthingVersioningVerifier`; `SyncEndpoints`. |
| **E** (Dictation)   | 4th   | BC-005 (verify+test), BC-006, BC-008, BC-009, BC-030, BC-033 (backend), BC-036 (verify), BC-037 (verify)                                                                                  | 3 (backend half), 14 (backend), N3                    | Restore `IdleResourceCache` (ADR-004 R4); crash-recovery PCM dump (ADR-004 R5); profile `transcriptionPromptOverride` wiring; `/api/models/scan` endpoint.                                      |

Every BC test path is authoritative in `ADR-007.md §4` (full BC text) and `ADR-007-shared.md §1.3` (backend test
layout).

---

## 2. Work order (do in this order — do not parallelise inside the agent)

Every MR follows: **red tests first → implementation → verify → snapshot.**

### 2.1 MR C — RAG (first)

**Preconditions.**

- Phase 1 Agent A has registered `NotYetWired{Embedding,VectorIndex,Rag}Service` stubs in `Program.cs`. You replace
  them.
- Python agent may still be in-flight on `/embed`; do **not** block on it — WireMock the sidecar for integration tests,
  real sidecar lives separately.

**Step 1 — Red-first tests.**

New test files (write red, do not run impl yet):

```
backend/tests/Mozgoslav.Tests/Application/Rag/NoteChunkerTests.cs
    Chunk_Short_SingleChunk
    Chunk_LongNote_SplitsAtTokenBoundary
    Chunk_ParagraphBoundary_PreferredOverSentenceMid

backend/tests/Mozgoslav.Tests/Application/Rag/RagServiceTests.cs
    Query_TopK_ReturnsOrderedByScore
    Query_WhenLlmUnreachable_ReturnsRawCitations
    Reindex_IteratesAllNotes_EmbedsEach

backend/tests/Mozgoslav.Tests.Integration/RagEndpointsTests.cs
    Post_RagQuery_ReturnsAnswerAndCitations
    Post_RagReindex_EmbedsAllProcessedNotes
    Post_RagQuery_EmptyIndex_ReturnsEmptyCitations

backend/tests/Mozgoslav.Tests.Integration/SqliteVectorIndexTests.cs
    Upsert_ThenQuery_ReturnsNeighbours
    Upsert_DuplicateId_OverwritesVector
    Query_HigherScoreFirst
```

All of them fail — red state is «symbol missing» (compile error) for unit tests, 404 for integration tests.

**Step 2 — Restore Application layer.**

Create / restore:

- `backend/src/Mozgoslav.Application/Rag/NoteChunk.cs` — record
  `{ string NoteId, string SegmentId, string Text, int TokenStart, int TokenEnd }`.
- `backend/src/Mozgoslav.Application/Rag/NoteChunker.cs` — deterministic token-approx splitter (char-count-based,
  target ≈ 512 tokens, overlap 64 tokens).
- `backend/src/Mozgoslav.Application/Interfaces/IEmbeddingService.cs` — `Task<float[]> EmbedAsync(string text, CT ct)`.
- `backend/src/Mozgoslav.Application/Interfaces/IVectorIndex.cs` —
  `Task UpsertAsync(string id, float[] vec, CT ct); Task<IReadOnlyList<(string id, float score)>> QueryAsync(float[] vec, int topK, CT ct);`.
- `backend/src/Mozgoslav.Application/Interfaces/IRagService.cs` —
  `Task<int> ReindexAllAsync(CT ct); Task<RagAnswer> QueryAsync(string question, int topK, CT ct);`.
- `backend/src/Mozgoslav.Application/Rag/RagService.cs` — orchestrates chunker → embedding → vector index → LLM
  provider.

LLM synthesis uses the existing `ILlmProviderFactory` → current provider → `ChatAsync(systemPrompt, userPrompt)`.
Graceful degradation — if LLM unreachable → `RagAnswer` with empty `Answer` and populated `Citations`.

**Step 3 — Infrastructure layer.**

- Add NuGet: `sqlite-vec`. Check feed at `Directory.Packages.props`:
  ```bash
  grep -n "sqlite-vec\|SqliteVec" backend/Directory.Packages.props || true
  ```
  If absent — add to `Directory.Packages.props`:
  ```xml
  <PackageVersion Include="SqliteVec" Version="<latest stable compatible with net10.0>" />
  ```
  and reference in `Mozgoslav.Infrastructure.csproj` (`<PackageReference Include="SqliteVec" />`). **If the feed does
  not carry a net10.0-compatible package — stop and escalate.** Do not hand-roll a native SQLite extension load here.

- Create `backend/src/Mozgoslav.Infrastructure/Rag/SqliteVectorIndex.cs` — implements `IVectorIndex` against
  `sqlite-vec`. Tables:
    - `vec_notes(id TEXT PRIMARY KEY, note_id TEXT, segment_id TEXT, embedding BLOB)`
- Create `backend/src/Mozgoslav.Infrastructure/Rag/PythonSidecarEmbeddingService.cs` — implements `IEmbeddingService`
  against `POST http://127.0.0.1:5060/api/embed { text }` → `{ embedding: number[] }` (384-dim). On
  `HttpRequestException` or non-2xx → log WARN, return a deterministic SHA-256 BoW 384-dim fallback (same formula as
  sidecar so dev boxes without PyTorch return the same vectors).
- Delete `BagOfWordsEmbeddingService` and `InMemoryVectorIndex` if still present on branch (the deterministic fallback
  now lives inside `PythonSidecarEmbeddingService`).

**Step 4 — Migration `0008_rag_embeddings`.**

```bash
cd backend/src/Mozgoslav.Infrastructure
dotnet ef migrations add 0008_rag_embeddings --startup-project ../Mozgoslav.Api -- -maxcpucount:1
```

Migration must add the `vec_notes` virtual table with `sqlite-vec` syntax. Verify the migration generated the correct
SQL; adjust `Up`/`Down` if EF cannot express `sqlite-vec` DDL — fall back to `ExecuteSqlRaw` inside the migration body.

**Step 5 — API endpoints.**

`backend/src/Mozgoslav.Api/Endpoints/RagEndpoints.cs`:

```csharp
public static class RagEndpoints
{
    public static IEndpointRouteBuilder MapRagEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/rag/reindex", async (IRagService svc, CancellationToken ct) =>
        {
            var embedded = await svc.ReindexAllAsync(ct);
            return Results.Ok(new { embeddedNotes = embedded });
        });

        endpoints.MapPost("/api/rag/query", async (
            RagQueryRequest req,
            IRagService svc,
            CancellationToken ct) =>
        {
            var answer = await svc.QueryAsync(req.Question, req.TopK ?? 5, ct);
            return Results.Ok(answer);
        });

        return endpoints;
    }
}

public sealed record RagQueryRequest(string Question, int? TopK);
```

Register in `Program.cs`:

```csharp
app.MapRagEndpoints();
```

And replace the stubs:

```csharp
builder.Services.RemoveAll<IEmbeddingService>();
builder.Services.AddSingleton<IEmbeddingService, PythonSidecarEmbeddingService>();
builder.Services.RemoveAll<IVectorIndex>();
builder.Services.AddSingleton<IVectorIndex, SqliteVectorIndex>();
builder.Services.RemoveAll<IRagService>();
builder.Services.AddSingleton<IRagService, RagService>();
```

(Delete the corresponding `NotYetWired*` classes.)

**Step 6 — Verify.**

```bash
dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1
dotnet test  backend/Mozgoslav.sln --filter "FullyQualifiedName~Rag" -maxcpucount:1 --no-restore
```

All RAG tests green. Smoke run + curls above.

---

### 2.2 MR B — UX backends (second)

**Preconditions.** MR C complete and green.

**Step 1 — Red-first tests.**

```
backend/tests/Mozgoslav.Tests/Domain/FolderMappingTests.cs
    FolderMapping_Create_ValidatesParaCategory

backend/tests/Mozgoslav.Tests.Integration/NoteManualCreateTests.cs
    Post_Notes_CreatesManualNote_ReturnsCreated201
    Post_Notes_NoBody_ReturnsStubNote

backend/tests/Mozgoslav.Tests.Integration/ObsidianBulkExportTests.cs
    Post_ExportAll_ExportsUnexportedOnly
    Post_ExportAll_ReturnsFailuresForVaultlessNotes
    Post_ApplyLayout_CreatesParaFolders_MovesNotes

backend/tests/Mozgoslav.Tests.Integration/ProfileDuplicateTests.cs
    Post_Duplicate_BuiltIn_ReturnsNewUserProfile
    Post_Duplicate_UserProfile_ReturnsNewId

backend/tests/Mozgoslav.Tests.Integration/TranscriptCheckpointTests.cs
    LongAudio_Checkpoints_EveryNSeconds_ResumesFromLast
    Resume_ReadsCheckpoint_ContinuesFromMark
```

**Step 2 — Transcript checkpoint (BC-017, Bug 21).**

Add migration `0009_transcript_checkpoints`:

```bash
cd backend/src/Mozgoslav.Infrastructure
dotnet ef migrations add 0009_transcript_checkpoints --startup-project ../Mozgoslav.Api -- -maxcpucount:1
```

Schema delta — `TranscriptSegment.CheckpointAt DATETIME NULL` (nullable, non-destructive). Update `Transcript` domain
entity with the field; reflect in the EF mapping.

Logic: every ~5 min of wall-clock transcription, `ProcessQueueWorker` (or the Whisper streaming loop) marks the latest
segment's `CheckpointAt = DateTime.UtcNow`. On resume, the worker queries
`Segments.Where(s => s.CheckpointAt != null).OrderByDescending(s => s.CheckpointAt).FirstOrDefault()` and restarts from
that position.

**Step 3 — Manual note (BC-022, Bug 4).**

New endpoint in existing `NoteEndpoints.cs`:

```csharp
endpoints.MapPost("/api/notes", async (
    ManualNoteRequest? req,
    IProcessedNoteRepository repo,
    CancellationToken ct) =>
{
    var note = new ProcessedNote
    {
        Id = Guid.NewGuid(),
        Source = NoteSource.Manual,
        Title = req?.Title ?? "Untitled",
        Markdown = req?.Body ?? string.Empty,
        CreatedAtUtc = DateTime.UtcNow,
    };
    await repo.AddAsync(note, ct);
    return Results.Created($"/api/notes/{note.Id}", note);
});

public sealed record ManualNoteRequest(string? Title, string? Body, string? TemplateId);
```

`NoteSource.Manual` enum variant — add if missing.

**Step 4 — Obsidian export-all + apply-layout (BC-025, Bug 22).**

New endpoints in existing `ObsidianEndpoints.cs`:

```csharp
endpoints.MapPost("/api/obsidian/export-all", async (
    IObsidianExportService svc,
    CancellationToken ct) =>
{
    var result = await svc.ExportAllUnexportedAsync(ct);
    return Results.Ok(result);
});

endpoints.MapPost("/api/obsidian/apply-layout", async (
    IObsidianLayoutService svc,
    CancellationToken ct) =>
{
    var result = await svc.ApplyParaLayoutAsync(ct);
    return Results.Ok(result);
});
```

`IObsidianExportService.ExportAllUnexportedAsync` iterates `ProcessedNote.Where(n => !n.ExportedToVault)`, calls
existing `ExportAsync(noteId)`, collects `{ exportedCount, skippedCount, failures[] }`.

`IObsidianLayoutService.ApplyParaLayoutAsync` — reads `FolderMapping` entities + `VaultExportRule` entities, creates
Inbox / Projects / People / Topics / Archive / Templates subfolders under the vault root (idempotent), moves
already-exported notes into the correct PARA folder per their profile's `ParaCategory` tag.

**Step 5 — New domain entities.**

If absent on branch:

- `backend/src/Mozgoslav.Domain/Entities/FolderMapping.cs` —
  `record FolderMapping(Guid Id, string Alias, string VaultPath, ParaCategory Category)`.
- `backend/src/Mozgoslav.Domain/Entities/VaultExportRule.cs` —
  `record VaultExportRule(Guid Id, string SourceProfileId, string TargetFolderAlias, bool AutoApplyOnExport)`.
- `backend/src/Mozgoslav.Domain/Enums/ParaCategory.cs` — `enum { Project, Area, Resource, Archive }`.

Migration `0011_folder_mapping` (created after 0009, 0010 if D lands before B — otherwise just the next unused index):

```bash
cd backend/src/Mozgoslav.Infrastructure
dotnet ef migrations add 0011_folder_mapping --startup-project ../Mozgoslav.Api -- -maxcpucount:1
```

EF tables: `folder_mappings`, `vault_export_rules`.

**Step 6 — Profile duplicate (BC-029).**

New endpoint in existing `ProfileEndpoints.cs`:

```csharp
endpoints.MapPost("/api/profiles/{id:guid}/duplicate", async (
    Guid id,
    IProfileRepository repo,
    CancellationToken ct) =>
{
    var src = await repo.GetByIdAsync(id, ct);
    if (src is null) return Results.NotFound();

    var copy = src with
    {
        Id = Guid.NewGuid(),
        Name = $"{src.Name} (copy)",
        IsBuiltIn = false,
    };
    await repo.AddAsync(copy, ct);
    return Results.Created($"/api/profiles/{copy.Id}", copy);
});
```

**Step 7 — Verify.**

```bash
dotnet test backend/Mozgoslav.sln --filter "FullyQualifiedName~(TranscriptCheckpoint|NoteManualCreate|ObsidianBulkExport|ProfileDuplicate|FolderMapping)" -maxcpucount:1 --no-restore
```

All green. Full suite:

```bash
dotnet build -c Release -maxcpucount:1
dotnet test  -maxcpucount:1 --no-restore
```

---

### 2.3 MR D — Syncthing (third)

**Preconditions.** MRs C and B complete and green.

**Step 1 — Red-first tests.**

```
backend/tests/Mozgoslav.Tests/Infrastructure/Syncthing/SyncthingSseEventParserTests.cs
    Parse_FolderSummary_YieldsExpectedEvent
    Parse_DeviceConnected_YieldsExpectedEvent
    Parse_Invalid_ReturnsNull_LogsWarning

backend/tests/Mozgoslav.Tests/Infrastructure/Syncthing/SyncthingHttpClientTests.cs
    Status_AggregatesFoldersAndDevices
    Status_On503_ReturnsSyncthingUnavailable

backend/tests/Mozgoslav.Tests/Infrastructure/Syncthing/SyncthingVersioningVerifierTests.cs
    Verify_AllThreeFoldersPresent_ReturnsTrue
    Verify_MissingFolder_ReturnsFalse_LogsReason

backend/tests/Mozgoslav.Tests.Integration/Syncthing/SyncthingLifecycleTests.cs
    Lifecycle_SpawnsOnRandomPort_BackendReconfigures
    Lifecycle_Shutdown_CallsRestShutdown

backend/tests/Mozgoslav.Tests.Integration/Syncthing/SyncStatusEndpointTests.cs
    Status_Mapped_FromRestResponses              (WireMock fixture)
    Status_SyncthingUnavailable_Returns503Json  (WireMock with 503)
```

Two of the above (`SyncthingLifecycleTests`, containerised `SyncStatusEndpointTests` happy path) use
`Testcontainers.syncthing/syncthing:latest` per `ADR-007-shared.md §1.3`.

**Step 2 — Restore Application-layer contracts.**

```
backend/src/Mozgoslav.Application/Interfaces/ISyncthingClient.cs
backend/src/Mozgoslav.Application/Interfaces/SyncthingEvent.cs   (record DU)
```

Signatures per the existing contract (look in `.archive/` for the pre-deletion snapshot):

```csharp
public interface ISyncthingClient
{
    Task<SyncStatus> GetStatusAsync(CancellationToken ct);
    Task<SyncHealth> GetHealthAsync(CancellationToken ct);
    Task<string>     GetPairingPayloadAsync(CancellationToken ct);
    Task             AcceptDeviceAsync(string deviceId, string name, IReadOnlyList<string>? folderIds, CancellationToken ct);
    IAsyncEnumerable<SyncthingEvent> StreamEventsAsync(CancellationToken ct);
}
```

**Step 3 — Restore Infrastructure layer.**

```
backend/src/Mozgoslav.Infrastructure/Services/SyncthingHttpClient.cs
backend/src/Mozgoslav.Infrastructure/Services/SyncthingConfigService.cs
backend/src/Mozgoslav.Infrastructure/Services/SyncthingFolderInitializer.cs
backend/src/Mozgoslav.Infrastructure/Services/SyncthingSseEventParser.cs
backend/src/Mozgoslav.Infrastructure/Services/SyncthingLifecycleService.cs     (NEW)
backend/src/Mozgoslav.Infrastructure/Seed/SyncthingVersioningVerifier.cs
```

Look for original shapes via `.archive/` if present; otherwise write per ADR-003 contract.

**`SyncthingLifecycleService` — the new piece.** Implements `IHostedService`.

Start-up sequence:

```csharp
public async Task StartAsync(CancellationToken ct)
{
    var port = FindFreePort();
    var apiKey = _settings.Current.SyncthingApiKey ?? GenerateApiKey();
    if (_settings.Current.SyncthingApiKey is null)
    {
        await _settings.UpdateAsync(s => s with { SyncthingApiKey = apiKey }, ct);
    }
    _process = Process.Start(new ProcessStartInfo
    {
        FileName = _paths.SyncthingBinary,
        ArgumentList =
        {
            "serve",
            "--no-browser",
            "--no-restart",
            $"--gui-address=127.0.0.1:{port}",
            $"--gui-apikey={apiKey}",
            "--home=" + _paths.SyncthingHome,
        },
        RedirectStandardOutput = true,
        RedirectStandardError = true,
    });
    await _settings.UpdateAsync(s => s with { SyncthingBaseUrl = $"http://127.0.0.1:{port}" }, ct);
    await WaitForReady(port, apiKey, ct);
}

private static int FindFreePort()
{
    var listener = new TcpListener(IPAddress.Loopback, 0);
    listener.Start();
    var port = ((IPEndPoint)listener.LocalEndpoint).Port;
    listener.Stop();
    return port;
}

private static string GenerateApiKey() =>
    Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
```

`StopAsync` — `POST http://127.0.0.1:{port}/rest/system/shutdown` with `X-API-Key` header; if that fails,
`_process.Kill(entireProcessTree: true)` after grace period.

**Step 4 — Remove Phase-1 `DisabledSyncthingClient` binding.**

In `Program.cs`, replace the Phase-1 guard branch:

```csharp
builder.Services.AddSingleton<ISyncthingClient, SyncthingHttpClient>();
builder.Services.AddHostedService<SyncthingLifecycleService>();
builder.Services.AddSingleton<SyncthingConfigService>();
builder.Services.AddSingleton<SyncthingFolderInitializer>();
builder.Services.AddSingleton<SyncthingSseEventParser>();
builder.Services.AddSingleton<SyncthingVersioningVerifier>();
```

Remove the `NotYetWiredSyncthingLifecycleService` stub binding.

**Step 5 — Migration `0010_syncthing_settings`.**

```bash
cd backend/src/Mozgoslav.Infrastructure
dotnet ef migrations add 0010_syncthing_settings --startup-project ../Mozgoslav.Api -- -maxcpucount:1
```

Extends `settings` row with nullable `SyncthingApiKey TEXT NULL`, `SyncthingBaseUrl TEXT NULL` (if not already present).

**Step 6 — Endpoints.**

`backend/src/Mozgoslav.Api/Endpoints/SyncEndpoints.cs`:

```csharp
public static class SyncEndpoints
{
    public static IEndpointRouteBuilder MapSyncEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/sync/status", ...);
        endpoints.MapGet("/api/sync/health", ...);
        endpoints.MapGet("/api/sync/pairing-payload", ...);
        endpoints.MapPost("/api/sync/accept-device", ...);
        endpoints.MapGet("/api/sync/events", ...);  // SSE bridge
        return endpoints;
    }
}
```

Register `app.MapSyncEndpoints()` in `Program.cs`.

**Step 7 — `.stignore` templates.**

Restore ADR-004 R7 default templates in `SyncthingFolderInitializer`. Three templates: recordings, notes, vault. Each
written on first-run per folder.

**Step 8 — Verify.**

```bash
dotnet test backend/Mozgoslav.sln --filter "FullyQualifiedName~Syncthing" -maxcpucount:1 --no-restore
```

Smoke:

```bash
dotnet run --project backend/src/Mozgoslav.Api --no-build &
sleep 8
curl localhost:5050/api/sync/health
# Expect: { running: true, port: <random>, ready: true }
```

---

### 2.4 MR E — Dictation reliability (last)

**Preconditions.** MRs C, B, D complete and green.

**Step 1 — Red-first tests.**

```
backend/tests/Mozgoslav.Tests/Application/DictationSessionManagerTests.cs
    BuildInitialPrompt_JoinsVocabularyTerms            (BC-005 — verify existing or add)
    BuildInitialPrompt_PrefersProfileOverride_OverVocabulary   (BC-030, N3 — red)

backend/tests/Mozgoslav.Tests/Application/PerAppProfileSelectionTests.cs
    Select_BundleInMap_ReturnsProfileId                (BC-006)
    Select_UnknownBundle_ReturnsDefault
    Select_EmptyMap_ReturnsDefault

backend/tests/Mozgoslav.Tests/Infrastructure/IdleResourceCacheTests.cs
    Get_FirstCall_BuildsFactory
    Get_SubsequentCall_ReturnsCachedFactory
    Get_AfterIdleTimeout_DisposesAndRebuilds
    Concurrent_GetUnderLoad_KeepsFactoryWarm

backend/tests/Mozgoslav.Tests.Integration/DictationCrashRecoveryTests.cs
    CrashMidSession_PcmBufferPersistsOnDisk
    Startup_OrphanPcmFile_LogsWarning

backend/tests/Mozgoslav.Tests.Integration/ModelScanEndpointTests.cs
    Scan_ReturnsBinAndGgufFiles
    Scan_UnknownExtension_MarkedUnknownKind
    Scan_NonExistentDir_Returns404
```

**Step 2 — Restore `IdleResourceCache<T>` (BC-008, ADR-004 R4).**

```
backend/src/Mozgoslav.Application/Interfaces/IIdleResourceCache.cs
backend/src/Mozgoslav.Infrastructure/Services/IdleResourceCache.cs
```

Signature:

```csharp
public interface IIdleResourceCache<T> : IAsyncDisposable where T : class
{
    Task<T> GetAsync(CancellationToken ct);
}

public sealed class IdleResourceCache<T> : IIdleResourceCache<T>, IAsyncDisposable where T : class
{
    private readonly Func<CancellationToken, Task<T>> _factory;
    private readonly TimeSpan _idleTimeout;
    private readonly ILogger<IdleResourceCache<T>> _logger;

    private T? _cached;
    private long _lastAccessTicks;
    private Timer? _idleTimer;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public IdleResourceCache(
        Func<CancellationToken, Task<T>> factory,
        TimeSpan idleTimeout,
        ILogger<IdleResourceCache<T>> logger)
    {
        _factory = factory;
        _idleTimeout = idleTimeout;
        _logger = logger;
        _idleTimer = new Timer(OnIdleTick, null, idleTimeout, idleTimeout);
    }

    public async Task<T> GetAsync(CancellationToken ct)
    {
        await _lock.WaitAsync(ct);
        try
        {
            Interlocked.Exchange(ref _lastAccessTicks, DateTime.UtcNow.Ticks);
            if (_cached is not null) return _cached;
            _cached = await _factory(ct);
            return _cached;
        }
        finally { _lock.Release(); }
    }

    private void OnIdleTick(object? _)
    {
        var idleFor = DateTime.UtcNow.Ticks - Interlocked.Read(ref _lastAccessTicks);
        if (TimeSpan.FromTicks(idleFor) < _idleTimeout) return;

        _lock.Wait();
        try
        {
            if (_cached is IDisposable d) d.Dispose();
            _cached = null;
            _logger.LogInformation("Disposed idle {Type}", typeof(T).Name);
        }
        finally { _lock.Release(); }
    }

    public ValueTask DisposeAsync() { /* clean up */ }
}
```

Wire `WhisperFactory` via the cache:

```csharp
builder.Services.AddSingleton<IIdleResourceCache<WhisperFactory>>(sp =>
    new IdleResourceCache<WhisperFactory>(
        factory: ct => WhisperFactory.FromPathAsync(sp.GetRequiredService<IAppSettings>().Current.WhisperModelPath, ct),
        idleTimeout: TimeSpan.FromMinutes(sp.GetRequiredService<IAppSettings>().Current.DictationModelUnloadMinutes),
        logger: sp.GetRequiredService<ILogger<IdleResourceCache<WhisperFactory>>>()));
```

Remove the Phase-1 `NotYetWiredIdleResourceCache<>` registration.

**Step 3 — Crash recovery PCM dump (BC-009, ADR-004 R5).**

`DictationSessionManager.StartAsync` opens `FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.Read)`
where `path = Path.Combine(AppPaths.Root, "temp", $"dictation-{sessionId}.pcm")`. Every `AudioChunk` →
`await stream.WriteAsync(chunk.Data)`. On successful `StopAsync` → `stream.Dispose()`, `File.Delete(path)`.

Startup check: enumerate `AppPaths.Root/temp/dictation-*.pcm`; for each file →
`_logger.LogWarning("Orphan dictation PCM buffer on disk: {Path}", f)`.

**Step 4 — Profile transcription prompt override (BC-030, N3).**

`DictationSessionManager.BuildInitialPrompt`:

```csharp
private string? BuildInitialPrompt(Profile profile, AppSettingsDto settings)
{
    var src = !string.IsNullOrWhiteSpace(profile.TranscriptionPromptOverride)
        ? profile.TranscriptionPromptOverride
        : string.Join(' ', settings.DictationVocabulary.Distinct());
    return string.IsNullOrWhiteSpace(src) ? null : src.Trim();
}
```

**Step 5 — Model scan endpoint (BC-033, Bug 14 backend).**

Extend existing `ModelEndpoints.cs` or create a new module:

```csharp
endpoints.MapGet("/api/models/scan", ([FromQuery] string dir) =>
{
    if (!Directory.Exists(dir))
        return Results.NotFound();

    var files = Directory.EnumerateFiles(dir, "*", SearchOption.TopDirectoryOnly)
        .Where(p => p.EndsWith(".bin") || p.EndsWith(".gguf"))
        .Select(p => new
        {
            path = p,
            filename = Path.GetFileName(p),
            size = new FileInfo(p).Length,
            kind = ClassifyModel(p),
        })
        .ToList();
    return Results.Ok(files);
});

static string ClassifyModel(string path)
{
    var name = Path.GetFileName(path).ToLowerInvariant();
    if (name.StartsWith("ggml")) return "whisper-ggml";
    if (name.Contains("vad")) return "vad-gguf";
    return "unknown";
}
```

**Step 6 — Verify.**

```bash
dotnet test backend/Mozgoslav.sln --filter "FullyQualifiedName~(IdleResourceCache|DictationCrashRecovery|ModelScan|PerAppProfile|DictationSessionManager)" -maxcpucount:1 --no-restore
# Full suite:
dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1
dotnet test  backend/Mozgoslav.sln                -maxcpucount:1 --no-restore
```

All green. Smoke:

```bash
curl "localhost:5050/api/models/scan?dir=$(pwd)"
```

---

## 3. Shared-file coordination (DO NOT break these)

Touch-list restricted to backend:

- `Program.cs` — you **add** endpoint maps and service registrations; you **remove** `NotYetWired*` lines when replacing
  with real impls. Do not touch the Kestrel/MVC/DatabaseInitializer/ModelDownload blocks laid down by Phase 1.
- `MozgoslavDbContext.cs` — you add new entity mappings in new regions. Do not touch the value-comparer block Phase 1
  placed.
- Migrations — your next index after Phase 1's `0007`. Strict order: `0008_rag_embeddings` →
  `0009_transcript_checkpoints` → `0010_syncthing_settings` → `0011_folder_mapping`. Any concurrent migration runner (
  there should not be one since this is a solo agent) would collide; if you see a `0008` you did not create, stop.

---

## 4. Acceptance checklist

- [ ] `dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1` — 0 errors, 0 warnings.
- [ ] `dotnet test  backend/Mozgoslav.sln -maxcpucount:1 --no-restore` — all green.
- [ ] No `NotYetWired*` file remains.
- [ ] Smoke curls pass for `/api/rag/query`, `/api/rag/reindex`, `/api/sync/status`, `/api/sync/health`, `/api/notes` (
  POST), `/api/obsidian/export-all`, `/api/obsidian/apply-layout`, `/api/profiles/{id}/duplicate`,
  `/api/models/scan?dir=<path>`.
- [ ] Startup log clean (no new WRNs introduced).
- [ ] `phase2-backend-report.md` at repo root: list closed BCs, closed bugs, file count, test count, open items (e.g. «
  `sqlite-vec` package version X.Y pinned»).

---

## 5. Escalation triggers

- `sqlite-vec` absent or incompatible with net10.0 → stop, escalate. Do not hand-roll native extension load.
- A test that Phase 1 left green turns red after your change → stop, you broke something in a shared surface. Report
  which test, which file.
- Migration index collision → stop, do not `--force`. Investigate whether another agent ran migrations (should not
  happen — backend agent is sole writer in `backend/`).
- Testcontainers Syncthing image cannot pull in the pod → fall back to WireMock happy-path coverage; mark BC-049's
  container test as `[Ignore("requires syncthing container")]` and document in the report.
- Any missing reference file in `.archive/` that the original iteration-7 expected to "retrieve from git history" —
  without git, the agent writes from scratch per the contract in this file; no quoting of deleted history.

---

## 6. Skills

- `superpowers:test-driven-development` (mandatory).
- `superpowers:verification-before-completion` (mandatory).
- `superpowers:systematic-debugging` (for SyncthingLifecycle and IdleResourceCache — subtle timing).
- `superpowers:writing-plans` (for MR C — multi-file RAG).
- `code-writing:integration-testing` (for Syncthing + RAG integration suites).
- `superpowers:requesting-code-review` (before hand-back).
