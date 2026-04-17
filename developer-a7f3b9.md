# Developer log — Phase 1 Agent A (id: a7f3b9)

**Working directory:** `/home/coder/workspace/mozgoslav-20260417/mozgoslav/`

## Pre-flight

```
dotnet build backend/Mozgoslav.sln -c Debug -maxcpucount:1
→ Build succeeded. 0 Warning(s), 0 Error(s)

dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1
→ Build succeeded. 0 Warning(s), 0 Error(s)
```

Branch state differs from ADR-007-phase1-agent-A.md:
- `FfmpegAudioRecorder.cs` absent (Step 1 is N/A).
- `ModelDownloadService.cs` already present (Step 7 needed refinement, not creation).
- `IdleResourceCache<T>` already present (Step 11 partial).
- RAG services fully registered (Step 11 RAG stubs skipped).
- Primary-constructor sweep already clean (Step 10 is N/A).

## Step execution

### Step 2 — DB path consolidation
Added `Log.Information("Using database at …")` and WARN on env override in `Program.cs`. Grep verified no other references to the DB path string existed.

### Step 3 — Kestrel + host de-dup
Removed the `ConfigureKestrel(…ListenLocalhost(5050))` block. Updated `appsettings.json` Urls to `http://127.0.0.1:5050`.

### Step 4 — Startup log de-dup
`DatabaseInitializer` now takes `IServiceScopeFactory` instead of scoped repos directly. Opens one scope, disposes it before `StartAsync` returns.

### Step 5 — EF value-comparers
Added `stringListComparer`, `actionItemListComparer`, `segmentListComparer` to `MozgoslavDbContext`. Attached via `.Metadata.SetValueComparer(…)` to all 8 listed properties.

### Step 6 — LogsController
Deleted `LogsEndpoints.cs`. Created `LogsController : ControllerBase` with `[Route("api/logs")]`. Wired `AddControllers()` + `MapControllers()` in Program.cs.

### Step 7 — Whisper default chain
Aligned `AppPaths.DefaultWhisperModelPath` filename with catalogue default. Added `antony66-ggml` alias resolver. Created `IModelDownloadCoordinator` + `ModelDownloadCoordinator` with a per-download `Channel<ModelDownloadProgress>`. Rewrote `POST /api/models/download` to 202 Accepted + `{downloadId}`; added `GET /api/models/download/stream` SSE.

### Step 8 — Syncthing probe guard
Created `DisabledSyncthingClient`. Conditional registration in `Program.cs`. `SyncthingVersioningVerifier` short-circuits when client is disabled.

### Step 9 — Queue reconciliation
Extracted static `QueueBackgroundService.ReconcileAsync(repo, ct)`. Invoked from `StartAsync` override. Flips 4 non-terminal statuses (Transcribing/Correcting/Summarizing/Exporting) to Queued, zeroes Progress, nulls StartedAt, sets ErrorMessage.

### Step 11 — NotYetWired stubs
Created only `NotYetWiredSyncthingLifecycleService` — the others would regress live services.

## Test additions

6 test files / 22 test methods. All green:

```
Passed!  - Failed: 0, Passed: 124, Skipped: 0, Total: 124  (Mozgoslav.Tests)
Passed!  - Failed: 0, Passed:  96, Skipped: 0, Total:  96  (Mozgoslav.Tests.Integration)
```

## Hiccups / 2-strike analysis

- **Hiccup 1:** `StartupLogTests` initial CA1307 (string.Contains overload). Fixed by adding `StringComparison.Ordinal`. 1 strike.
- **Hiccup 2:** `QueueStartupReconciliationTests` raced with the running `ProcessQueueWorker` because the seeded jobs pointed at non-existent `RecordingId`s. Root-caused (systematic-debugging skill): the full host runs, processes the Queued jobs, fails them. Fix: extracted static `ReconcileAsync` seam and test against it directly, matching the superpowers:test-driven-development principle of "isolate the unit under test". 1 strike.
- **Hiccup 3:** `ModelDownloadServiceTests` had IDISP analyzer noise. Fixed by pre-disposing old instances and suppressing one legitimate NSubstitute IDISP004 with an in-source pragma + documented reason. 1 strike.

No 2-strike triggers hit.

## Startup smoke

```
[INF] Using database at /home/coder/.config/Mozgoslav/mozgoslav.db
[INF] SQLite schema ensured             (× 1)
[INF] Seeded 3 built-in profiles        (× 1)
[INF] Populated default settings on first run
[INF] Settings ready: language=ru, vault=<not set>
[INF] Queue background service started
[INF] Syncthing disabled — skipping versioning verifier
[INF] Now listening on: http://127.0.0.1:5050
[INF] Application started. Press Ctrl+C to shut down.
```

No `Overriding address(es)`, no `Connection refused`, no EF value-comparer warning.

## Acceptance curls

```
GET  /api/logs                                      → 200 [ {fileName, sizeBytes, lastModifiedUtc} ]
GET  /api/logs/tail?lines=10                        → 200 {file, lines, totalLines}
GET  /api/profiles                                  → 200 [ 3 built-ins ]
POST /api/models/download {"catalogueId":"antony66-ggml"}
                                                    → 202 {"downloadId":"0a60c04e…"}
```

## Frontend

```
npm install --legacy-peer-deps            → 288 packages (eslint peerOptional conflict, legacy resolver needed)
npm --prefix frontend run typecheck       → PASS
npm --prefix frontend run lint            → PASS
npm --prefix frontend test                → 47/47 passing (9 suites)
```

## Final build verification

```
dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1 -nodeReuse:false
→ 0 errors, 0 warnings
```

## Hand-off document

Written at `/home/coder/workspace/mozgoslav-20260417/mozgoslav/phase1-agent-a-report.md`.
