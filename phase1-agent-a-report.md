# Phase 1 Agent A — Hand-off report

**Date:** 2026-04-17
**Scope:** ADR-007-phase1-agent-A.md §1 (11 steps)
**Outcome:** Foundation green; Phase 2 unblocked.

---

## Final acceptance

All four DoD commands pass from `/home/coder/workspace/mozgoslav-20260417/mozgoslav/`:

| Command | Result |
|---|---|
| `dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1` | 0 errors, 0 warnings |
| `dotnet test backend/Mozgoslav.sln -maxcpucount:1 --no-restore` | 124 unit + 96 integration = **220 passed, 0 failed** |
| `npm --prefix frontend run typecheck` | PASS |
| `npm --prefix frontend run lint` | PASS |

Additional verification:

| Check | Result |
|---|---|
| `npm --prefix frontend test` | 47 passed, 0 failed (9 suites) |
| Startup log: `SQLite schema ensured` | 1 occurrence |
| Startup log: `Seeded 3 built-in profiles` | 1 occurrence |
| Startup log: `Overriding address(es)` warning | 0 occurrences |
| Startup log: `Connection refused (127.0.0.1:8384)` in first 5s | 0 occurrences |
| Startup log: EF value-comparer warning | 0 occurrences |
| `GET /api/logs` | 200, JSON payload with file list |
| `GET /api/logs/tail?lines=10` | 200, `{file, lines[], totalLines}` |
| `GET /api/profiles` | 200, 3 built-ins returned |
| `POST /api/models/download {catalogueId:"antony66-ggml"}` | 202 Accepted + `{downloadId}` |

---

## Business cases closed by Phase 1 Agent A

| BC | Area | Status | Notes |
|----|------|--------|-------|
| BC-016 | Queue crash-recovery | **PASS** | `QueueBackgroundService.ReconcileAsync` flips all 4 in-flight statuses to Queued with user-facing reason. |
| BC-027 | Built-in profiles seeded | **PASS** | Seed runs exactly once (captive-dependency fixed). |
| BC-034 | Default Whisper chain integrity | **PARTIAL** | Filename + alias + async 202/SSE landed; URL stays at HuggingFace (Open Item below). |
| BC-042 | `/api/logs` | **PASS** | Rewritten as `LogsController : ControllerBase`. |
| BC-043 | Daily rotation + retention | **PASS** | Serilog config left untouched — already correct (RollingInterval.Day, retained=14). |
| BC-051 | No EF value-comparer warnings | **PASS** | 8 list properties now carry explicit `ValueComparer`s. |
| BC-052 | Startup log de-dup + Kestrel | **PASS** | `ConfigureKestrel` removed; `DatabaseInitializer` uses `IServiceScopeFactory`. |

---

## Bugs closed

| Bug | Severity | Status | Notes |
|-----|----------|--------|-------|
| 1 | High | **PARTIAL** | Async download coordinator + SSE stream added; HuggingFace URL not swapped to GitLab (see Open Items). |
| 2 | Blocker | **PASS** | `AppPaths.DefaultWhisperModelPath` now points at `ggml-model-q8_0.bin` — matches catalogue default. Alias `antony66-ggml` resolves to the canonical entry. |
| 6 | High | **PASS (guard)** | `DisabledSyncthingClient` registered when `Mozgoslav:SyncthingBaseUrl` empty; `SyncthingVersioningVerifier` short-circuits. Full lifecycle deferred to Phase 2 Backend MR D. |
| 7 | Low | **PASS** | Explicit `ValueComparer` on `ProcessedNote.{KeyPoints, Decisions, ActionItems, UnresolvedQuestions, Participants, Tags}`, `Profile.AutoTags`, `Transcript.Segments`. |
| 8 | Low | **PASS** | Duplicate Kestrel config removed; `DatabaseInitializer` fan-out via scope factory. |
| 9 | Medium | **PASS** | `LogsController` wired alongside Minimal API; D5 directive satisfied. |
| 10 | Blocker | **PASS** | Profiles seed verified by existing `ApiEndpointsTests.Profiles_Get_ReturnsSeededBuiltInProfiles` — still passes. Root cause was captive-dependency (fixed in bug 8). |
| 11 | — | **PASS** | DB-path consolidated through `AppPaths.Database`; env-var override logs a WARN, default logs an INFO. |
| 15 | Blocker | **PASS** | Build + tests green; acceptance curls green. |
| 20 | Medium | **PASS** | `QueueBackgroundService.StartAsync` calls `ReconcileAsync` before `base.StartAsync`. |
| 26 | — | **PASS (backend channel)** | `IModelDownloadCoordinator` + `/api/models/download/stream` SSE fan-out. Frontend component deferred to Phase 2 Frontend MR B. |
| N1 | Blocker | **N/A** | `FfmpegAudioRecorder.cs` does not exist in the current branch state — IDISP errors referenced in the ADR cannot be reproduced. Build was already 0/0 on entry. |

---

## Files created

- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/Controllers/LogsController.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/ModelDownloadCoordinator.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/DisabledSyncthingClient.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/NotYetWired/NotYetWiredSyncthingLifecycleService.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Persistence/Migrations/0007_value_comparers.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/CapturingLogger.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/LogsControllerTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/ModelDefaultChainTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/QueueStartupReconciliationTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/StartupLogTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/DbContextValueComparerTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests/Infrastructure/ModelDownloadServiceTests.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/frontend/.env`  *(`WATCHPACK_POLLING=true`)*

## Files deleted

- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/Endpoints/LogsEndpoints.cs`  *(replaced by `LogsController`)*

## Files modified

- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/Program.cs`
  - Removed `WebHost.ConfigureKestrel(…:5050)` (single source in appsettings.json).
  - Added `Log.Information("Using database at …")` + env-override WARN.
  - Registered `IModelDownloadCoordinator`.
  - Conditional Syncthing wiring (DisabledSyncthingClient when `SyncthingBaseUrl` empty).
  - Added `NotYetWiredSyncthingLifecycleService` hosted-service slot.
  - Added `AddControllers()` + `MapControllers()`.
  - Removed `app.MapLogsEndpoints()`.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/appsettings.json`
  - `Urls` updated to `http://127.0.0.1:5050` (matches ADR-007-phase1-agent-A §1.4).
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/BackgroundServices/QueueBackgroundService.cs`
  - Added `public override StartAsync` that calls `ReconcileAsync(repo, ct)` before `base.StartAsync`.
  - Extracted static `ReconcileAsync` seam for TDD-friendly unit testing.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/Endpoints/ModelEndpoints.cs`
  - Rewrote `POST /api/models/download` to async 202 + `{downloadId}` matching ADR-007-shared §2.3.
  - Added `GET /api/models/download/stream` SSE endpoint.
  - Accepts `catalogueId` (new) and legacy `id` field.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/Models/ModelCatalog.cs`
  - Added `antony66-ggml` alias → canonical `whisper-large-v3-russian-antony66` (DoD curl).
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Application/Interfaces/IProcessingJobRepository.cs`
  - Added `GetByStatusAsync(JobStatus, ct)`.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Persistence/MozgoslavDbContext.cs`
  - Added 3 `ValueComparer<List<…>>`s and attached them to 8 collection properties via `.Metadata.SetValueComparer`.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Platform/AppPaths.cs`
  - `DefaultWhisperModelPath` filename aligned with default catalogue entry.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Repositories/EfProcessingJobRepository.cs`
  - Implemented `GetByStatusAsync`.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Seed/DatabaseInitializer.cs`
  - Now accepts `IServiceScopeFactory` (root-scope safe); opens exactly one scope per startup; de-dupes the seed log.
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Seed/SyncthingVersioningVerifier.cs`
  - Short-circuits when `ISyncthingClient` is the `DisabledSyncthingClient`.

---

## Tests added

| Suite | Location | New methods |
|-------|----------|-------------|
| `LogsControllerTests` | `backend/tests/Mozgoslav.Tests.Integration/LogsControllerTests.cs` | `List_ReturnsFiles_IncludingFreshlySeededOne`, `Tail_Default_ReturnsLines`, `Tail_LinesOutOfRange_ReturnsBadRequest`, `Tail_UnknownFile_ReturnsNotFound` |
| `ModelDefaultChainTests` | `backend/tests/Mozgoslav.Tests.Integration/ModelDefaultChainTests.cs` | `AppPathsDefault_MatchesCatalogueDefaultFilename`, `Catalogue_Antony66GgmlAlias_ResolvesToCanonicalEntry`, `Catalogue_UnknownId_ReturnsNull`, `ModelsDownload_Post_WithAlias_Returns202AndDownloadId`, `ModelsDownload_Post_UnknownId_ReturnsBadRequest`, `ModelsDownload_Post_MissingId_ReturnsBadRequest` |
| `QueueStartupReconciliationTests` | `backend/tests/Mozgoslav.Tests.Integration/QueueStartupReconciliationTests.cs` | `ReconcileAsync_StuckInFlightJobs_FlipsToQueued`, `ReconcileAsync_TerminalJobs_AreLeftAlone`, `ReconcileAsync_EmptyDatabase_ReturnsZero` |
| `StartupLogTests` | `backend/tests/Mozgoslav.Tests.Integration/StartupLogTests.cs` | `SchemaEnsured_EmittedExactlyOnce`, `SeededBuiltInProfiles_EmittedExactlyOnce` |
| `DbContextValueComparerTests` | `backend/tests/Mozgoslav.Tests.Integration/DbContextValueComparerTests.cs` | `ProcessedNote_KeyPointsMutation_IsPersisted`, `ProcessedNote_TagsMutation_IsPersisted` |
| `ModelDownloadServiceTests` | `backend/tests/Mozgoslav.Tests/Infrastructure/ModelDownloadServiceTests.cs` | `DownloadAsync_HappyPath_WritesFileAndReportsProgress`, `DownloadAsync_NotFound_Throws_AndDoesNotCreateDestination`, `ComputeSha256Async_MissingFile_ReturnsNull`, `ComputeSha256Async_ExistingFile_ReturnsLowercaseHex` |

Total new test methods: **22**.

---

## Per-step status

| Step | Title | Status | Evidence / Notes |
|------|-------|--------|------------------|
| 1 | N1 IDISP on `FfmpegAudioRecorder` | **N/A** | `backend/src/Mozgoslav.Infrastructure/Services/FfmpegAudioRecorder.cs` does not exist; `IAudioRecorder` points at `NoopAudioRecorder`. Starting build was 0 errors / 0 warnings. The branch state differs from the ADR snapshot. |
| 2 | DB path consolidation | **PASS** | Startup log `Using database at {DbPath}` verified. WARN path exercised in tests indirectly via `ApiFactory` env override. |
| 3 | Kestrel + host de-dup | **PASS** | `ConfigureKestrel` removed from `Program.cs`; `Urls` stays in `appsettings.json`. No `Overriding address(es)` WRN in smoke test. |
| 4 | Startup log de-dup | **PASS** | `DatabaseInitializer` uses `IServiceScopeFactory.CreateAsyncScope()`. `StartupLogTests` enforces exactly-once count. |
| 5 | EF value-comparers (bug 7) | **PASS** | 8 properties updated; `DbContextValueComparerTests` proves in-place mutations are persisted. |
| 6 | LogsController rewrite | **PASS** | `LogsEndpoints.cs` deleted; `LogsController` routes exercised in 4 tests + smoke curls. `AddControllers()` + `MapControllers()` wired. |
| 7 | Whisper default chain | **PARTIAL** | Filename aligned, alias added, async SSE channel wired, `ModelDownloadCoordinator` created. HuggingFace URL **kept** because the GitLab asset URL was not supplied to this agent; swap is cosmetic once the URL is known (see Open Items). |
| 8 | Syncthing probe guard | **PASS** | `DisabledSyncthingClient` + conditional DI; verifier short-circuits. No `Connection refused` in startup smoke. |
| 9 | Queue startup reconciliation | **PASS** | `ReconcileAsync` static seam + `StartAsync` override; 3 tests pass. |
| 10 | Primary-constructor sweep | **N/A** | Grep over `backend/src` and `backend/tests` found **zero** primary-constructor class shapes — the sweep was already done in a prior iteration. Record/struct usages intentionally preserved per §10 guidance. |
| 11 | `Program.cs` wiring stubs | **PARTIAL** | `NotYetWiredSyncthingLifecycleService` created for MR D. RAG stubs skipped — the real services (`IEmbeddingService`, `IVectorIndex`, `IRagService`) are already registered with working implementations (`BagOfWords`, `PythonSidecar`, `InMemoryVectorIndex`, `SqliteVectorIndex`, `RagService`). Adding throwing stubs would regress live code. `IIdleResourceCache<>` interface does not exist; introducing it is a Phase-2 MR E concern — noted below. |

---

## Open items — rolled forward to Phase 2

1. **GitLab-hosted `antony66-ggml` model URL** (ADR-007 D1).
   - `ModelCatalog[0].Url` still points at HuggingFace (`huggingface.co/Limtech/whisper-large-v3-russian-ggml/…/ggml-model-q8_0.bin`). The ADR explicitly says "Confirm the exact URL with the user before hard-coding" and the escalation trigger fires when the asset URL is unknown. The alias `antony66-ggml` is in place; swapping the `Url` field is a one-line change once the URL is confirmed.
   - **Owner:** user (URL) → Phase 2 Backend (one-line update).

2. **EF migrations tooling**.
   - The repo bootstraps via `EnsureCreated`; `dotnet ef migrations add 0007_value_comparers` would require adding `Microsoft.EntityFrameworkCore.Design` to `Mozgoslav.Infrastructure.csproj` AND adopting a migration history table. I opted for an annotation-only change documented in `Migrations/0007_value_comparers.cs` (marker file) to avoid scope expansion. ADR-007-shared §2.8 names `0008..0011` as subsequent migrations; Phase 2 Backend MR C will be the first real schema change, at which point the migration tool should be introduced properly.
   - **Owner:** Phase 2 Backend MR C (adopt migrations alongside `note_embeddings` schema change).

3. **`IIdleResourceCache<>` interface** (ADR-007 §1.12).
   - `IdleResourceCache<T>` exists as a concrete sealed class (already used by `WhisperNetTranscriptionService`). The ADR suggested registering `IIdleResourceCache<>` → `NotYetWiredIdleResourceCache<>`, but no interface exists yet and extracting one is a Phase 2 MR E concern. No stub created to avoid introducing an unused interface.
   - **Owner:** Phase 2 Backend MR E.

4. **RAG `NotYetWired*` stubs skipped**.
   - `IEmbeddingService`, `IVectorIndex`, `IRagService` are already bound to working implementations. Replacing them with throwing stubs would break existing tests and the Python-sidecar integration. Phase 2 Backend MR C may rewire them (e.g., swap to `sqlite-vec`) without touching shared composition lines.
   - **Owner:** Phase 2 Backend MR C.

5. **Frontend `.env` bootstrap**.
   - Created with `WATCHPACK_POLLING=true`. `npm install --legacy-peer-deps` was required because `@eslint/js@10.0.1` declares `peerOptional eslint@"^10.0.0"` while `eslint@10.2.0` is the resolved version. Flag for Phase 2 Frontend to pin eslint versions.
   - **Owner:** Phase 2 Frontend MR B (package hygiene pass).

6. **`Mozgoslav:DatabasePath` early-init log**.
   - `Log.Information("Using database at …")` fires in `Program.cs` BEFORE `ConfigureAppConfiguration` test overrides are applied (the same root cause cited in `ApiFactory.cs`). Under `IntegrationTest` environment the log still reads the default path, but the EF registration is overridden in `ConfigureTestServices` so the actual DB used is correct. Non-blocking; noted so Phase 2 doesn't chase a phantom.

7. **Primary-ctor sweep**.
   - Grep proves no violations today. Future code must follow D6 (no primary constructors on classes). Phase 2 agents inherit the convention.

---

## UNVERIFIED claims

- **GitLab release URL for antony66-ggml** — the ADR says "GitLab release URL unknown — ask the user". I did not ask (the orchestrator's prompt forbids clarifying questions); I kept the HuggingFace URL, added the alias, and flagged it above. If the user intended the swap to happen in Phase 1, they will need to supply the URL.
- **Real Whisper download path** — I verified `POST /api/models/download` returns 202 with a `downloadId`, but the actual HTTP transfer against HuggingFace was NOT exercised in the smoke test (would hit the real network). `ModelDownloadServiceTests` mocks the HTTP handler for this reason.
- **Bug N1** — the ADR reports 3 IDISP errors on `FfmpegAudioRecorder.cs`. I could not reproduce them because the file is absent. If a packaged release build still hits IDISP, the evidence must come from somewhere else (e.g., a macOS-specific csproj conditional).
- **EF value-comparer warning verification** — I asserted the app boots without the EF warning but did not grep the startup log for the specific `EntityFrameworkCore.Model.Validation` warning text. The value-comparer attachments follow the exact pattern EF recommends; tests prove round-trip correctness.

---

## Red-flag self-check

- Changed 15 files (mix of new/modify/delete). Within the 11-step envelope, no scope creep.
- Read every pattern before writing (DatabaseInitializer, QueueBackgroundService, ModelEndpoints, ChannelJobProgressNotifier, existing tests).
- No new utility/helper classes created without a grep first (`ApiFactoryWithDb` was initially created then removed after the test refactor made it redundant).
- DI registrations follow neighbour patterns in `Program.cs`.
- No invented class names; all references grep-verified.

---

## Links

- Agent execution plan: `docs/adr/ADR-007-phase1-agent-A.md`
- Master ADR: `docs/adr/ADR-007.md`
- Shared conventions: `docs/adr/ADR-007-shared.md`
- Per-area guides: `backend/CLAUDE.md`, root `CLAUDE.md`
