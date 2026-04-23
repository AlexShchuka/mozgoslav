# Mozgoslav Backend — Scaffolding Report

## Status

- `dotnet restore -maxcpucount:1` — ok
- `dotnet build -maxcpucount:1 --no-restore` — ok (6 projects, 0 errors, 0 warnings)
- `dotnet test -maxcpucount:1 --no-build` — ok (24 passed, 0 failed, 0 skipped)
    - `Mozgoslav.Tests`: 21 passed
    - `Mozgoslav.Tests.Integration`: 3 passed
- Manual API smoke: `dotnet run` → `GET /api/health` returns `200 {"status":"ok","time":"..."}`; `/api/recordings` and
  `/api/jobs` return `[]`.

## What is implemented (Iteration 0 + minimal Iteration 1 slice)

### Solution

- `Mozgoslav.sln` with 4 source + 2 test projects
- Central build (`Directory.Build.props`: net9.0, nullable enable, implicit usings, warnings-as-errors)
- Central package management (`Directory.Packages.props`, versions pinned per `DEFAULT-CONFIG.md §2`)
- `global.json` pins SDK band to 9.0.*
- Local `NuGet.config` with a clean `nuget.org`-only source set (isolates the scaffold from any ambient private feed
  configured at user scope)

### `Mozgoslav.Domain`

- Entities: `Recording`, `Transcript`, `ProcessedNote`, `Profile`, `ProcessingJob`
- Value objects: `TranscriptSegment`, `ActionItem` (records)
- Enums: `AudioFormat`, `SourceType`, `RecordingStatus`, `JobStatus`, `ConversationType`, `CleanupLevel`
- Domain services:
    - `FillerCleaner.Clean(text, CleanupLevel)` — dictionary + regex, whole-word matching over Cyrillic; Aggressive
      level additionally strips multi-word fillers
    - `HashCalculator.Sha256Async(path/stream, ct)` — deterministic, lowercase hex
    - `AudioFormatDetector.FromExtension(ext)` + `TryFromExtension(ext, out)` with 8 supported formats
- Zero external package dependencies

### `Mozgoslav.Application`

- Port interfaces: `IRecordingRepository`, `ITranscriptRepository`, `IProcessedNoteRepository`, `IProfileRepository`,
  `IProcessingJobRepository`, `IAudioConverter`, `ITranscriptionService`, `ILlmService` (+ `LlmProcessingResult`),
  `IMarkdownExporter`
- Use case: `ImportRecordingUseCase`
    - Validates input, resolves default or requested profile
    - Verifies file exists, recognises format
    - Computes SHA-256 for idempotent dedup; duplicate hash returns the existing recording without re-enqueue
    - Creates `Recording` row and enqueues a `ProcessingJob`
- Depends only on Domain

### `Mozgoslav.Infrastructure`

- `SqliteConnectionFactory` — double-checked locking around embedded `schema.sql`; both sync and async open methods
- Embedded `Persistence/schema.sql` with `recordings`, `transcripts`, `processed_notes`, `profiles`, `processing_jobs`,
  `settings` plus supporting indexes (BACKEND-SPEC §5.4)
- `SqliteRecordingRepository` (Dapper): `AddAsync`, `GetByIdAsync`, `GetBySha256Async`, `GetAllAsync`, `UpdateAsync`
- Temporary in-memory implementations so the full import request path works end-to-end today:
    - `InMemoryProcessingJobRepository`
    - `InMemoryProfileRepository` — seeded with the three built-in profiles from BACKEND-SPEC §5.5 / DEFAULT-CONFIG §6 (
      Рабочий, Неформальный, Полная заметка)

### `Mozgoslav.Api`

- `Program.cs` with Kestrel bound to `http://localhost:5050`, CORS "allow any" policy (dev), DI wiring
- Endpoints split per concern under `Endpoints/`:
    - `GET  /api/health` → `200 { status, time }`
    - `GET  /api/recordings` → `200` list from `IRecordingRepository`
    - `POST /api/recordings/import` → runs `ImportRecordingUseCase`; `400` on unknown profile / missing file /
      unsupported format
    - `GET  /api/jobs` → `200` list from `IProcessingJobRepository`
- `appsettings.json` exposes `Mozgoslav:DatabasePath`
- `public partial class Program;` marker is present for future `WebApplicationFactory` tests

### Tests

`Mozgoslav.Tests` (xUnit + NSubstitute + FluentAssertions):

- `FillerCleanerTests` — none/light/aggressive/empty (4)
- `HashCalculatorTests` — deterministic, discriminating, file-vs-stream (3)
- `AudioFormatDetectorTests` — theory for 9 known cases, unknown throws, `TryFromExtension` false path (11 including
  theory rows)
- `ImportRecordingUseCaseTests` — missing file throws, new file persists + enqueues, duplicate SHA is idempotent (3)

`Mozgoslav.Tests.Integration` (xUnit + FluentAssertions + real `Microsoft.Data.Sqlite` on a temp file):

- Add→GetById round-trip
- GetAll returns multiple inserts
- GetBySha256 for unknown hash returns null

## Decisions beyond spec (called out for visibility)

1. **In-memory stores for jobs and profiles** — BACKEND-SPEC shows SQLite implementations for all repositories; this
   scaffold only implements `SqliteRecordingRepository` as the task required and uses clearly-named `InMemory*`
   implementations so the `POST /api/recordings/import` flow is actually exercisable today. Will be replaced in
   Iterations 2-3. Both are entered into TODO.md.
2. **Local `NuGet.config`** — needed to override an ambient private feed present in the sandbox user-scope config; the
   file only `<clear />`s sources and re-adds `nuget.org`, so the project stays open-source-ready.
3. **`IProfileRepository.TryGetDefaultAsync`** — renamed from spec's `GetDefaultAsync` because it can legitimately
   return `null` on a fresh database before seeding. `Try` prefix follows the naming rules.
4. **`LlmProcessingResult` uses `IReadOnlyList<T>`** — prefer immutable collection contracts over `List<T>` at boundary
   types.
5. **`Mozgoslav.Api/mozgoslav.db`** — appsettings default is a relative path; during a local `dotnet run` from the
   project folder this creates `mozgoslav.db` next to the DLLs. Covered by `.gitignore` (`*.db`). On macOS the real
   target is `~/Library/Application Support/Mozgoslav/secondbrain.db`, plumbed via `Mozgoslav:DatabasePath` later.

## Rules compliance

- Target framework: `net9.0` throughout (no bump) — verified in `Directory.Build.props` and by successful build on .NET
  9.0.312 SDK
- Dapper only, no EF Core
- No commits, no branches, no pushes (per instructions)
- No internal company/team references anywhere in source
- Nullable reference types enabled, warnings-as-errors clean
- Built on Linux (sandbox) — CoreML / NAudio / macOS-only APIs not referenced yet; deferred to TODO when they land in
  Iterations 2 and 6

## Known limitations / TODO

See `TODO.md` for the full list. Summary:

- SQLite repositories for transcripts, processed notes, profiles, jobs (Iteration 1 cont.)
- Audio converter (ffmpeg subprocess), transcription service (Whisper.net), LLM service (Iteration 2+)
- Markdown exporter and `ProcessQueueWorker` background service (Iteration 2+)
- SSE `/api/jobs/stream` and the remaining endpoints listed in BACKEND-SPEC §6.1
- Integration test for `POST /api/recordings/import` via `WebApplicationFactory`
- macOS-only APIs (NAudio / CoreML bindings) deferred to Iteration 2 / 6

---

**One-sentence summary:** Iteration 0 scaffold + Iteration 1 domain/application/infrastructure slice is in place —
solution builds clean on .NET 9, 24/24 tests pass, and the minimal API on `http://localhost:5050` answers `/api/health`,
`/api/recordings`, `/api/recordings/import`, and `/api/jobs`.
