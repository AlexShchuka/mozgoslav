# Phase 2 Backend — resume run log

## Build

`dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1`
→ **7 projects, 0 errors, 0 warnings.**

## Tests

`dotnet test backend/Mozgoslav.sln -c Release -maxcpucount:1 --no-build`
→ **132 unit + 113 integration = 245/245 passed, 0 failed, 0 skipped.**

Entry-state failures (4) all resolved:

- `Post_Notes_WithTitleAndBody_Returns201_AndPersistsManualNote` — now green (NoteSource serialised as string via
  `[JsonConverter]`).
- `Post_ExportAll_NoVaultConfigured_ReturnsBadRequest` — endpoint wired + `InvalidOperationException` → 400.
- `Post_ExportAll_WithVaultAndOneUnexportedNote_ExportsAndReportsCount` — endpoint wired; existing
  `ObsidianBulkExportService` handles skip/export logic.
- `Post_ApplyLayout_CreatesParaFolders_ReturnsCreatedCount` — endpoint wired + new `ObsidianLayoutService` creates
  `Projects/Areas/Resources/Archive/Inbox/Templates` idempotently.

Newly added green tests (this slice): 6 total.

- `SyncthingLifecycleServiceTests` — 3 unit tests (disabled, no-binary, stop-without-start).
- `ModelScanEndpointTests` — 3 integration tests (404 missing dir, 404 missing param, 200 mixed file kinds).

## Smoke curls (live backend)

All endpoints returned the frozen contract shape:

- `POST /api/rag/query {"question":"ping"}` → `{"answer":…,"citations":[],"llmAvailable":true}`.
- `GET /api/sync/status` → `{"folders":[],"devices":[]}`.
- `GET /api/sync/health` → `{"healthy":false}`.
- `POST /api/notes {"title":"smoke"}` → `201 Created` + `{"source":"Manual", …}`.
- `POST /api/obsidian/export-all` (no vault) → `400` + `{"error":"Vault path is not configured"}`.
- `POST /api/obsidian/apply-layout` (no vault) → `400` + `{"error":"Vault path is not configured"}`.
- `GET /api/models/scan?dir=<empty-dir>` → `[]`.

## Files changed

Created:

-

`/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/ObsidianLayoutService.cs`
-
`/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/SyncthingLifecycleService.cs`
-
`/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests/Infrastructure/SyncthingLifecycleServiceTests.cs`
-
`/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/ModelScanEndpointTests.cs`

- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/phase2-backend-report.md`

Modified:

- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/Endpoints/ObsidianEndpoints.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/Endpoints/ModelEndpoints.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Api/Program.cs`
- `/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Domain/Enums/NoteSource.cs`
-

`/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/Rag/PythonSidecarEmbeddingService.cs`
-
`/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/tests/Mozgoslav.Tests.Integration/Rag/PythonSidecarEmbeddingServiceTests.cs`

Deleted:

-

`/home/coder/workspace/mozgoslav-20260417/mozgoslav/backend/src/Mozgoslav.Infrastructure/NotYetWired/NotYetWiredSyncthingLifecycleService.cs` (
directory `NotYetWired/` removed).

## Escalations

None. Two pieces explicitly deferred as PARTIAL per hand-off report:

- MR E — `IIdleResourceCache<T>` extraction and `Profile.TranscriptionPromptOverride` wiring.
- MR D — cross-boot persistence of `SyncthingApiKey`/`SyncthingBaseUrl` via migration `0010_syncthing_settings`.

One flaky test observed once (`ModelDownloadServiceTests.DownloadAsync_HappyPath_WritesFileAndReportsProgress`); passed
on re-run and in isolation. Pre-existing, not modified this slice.
