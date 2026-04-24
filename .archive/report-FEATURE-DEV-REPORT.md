# FEATURE-DEV-REPORT — wire-everything-green

Branch: `shuka/wire-everything-green`. Base: `fc86c4a`.

## Findings (Discovery, Phase A)

### Repository snapshot on entry

The `fc86c4a` snapshot contained a mostly-implemented three-tier app with roughly the shape described in SELF-REVIEW.md,
but:

- **Backend did not compile.** First failure was in `Mozgoslav.Application/UseCases/ProcessQueueWorker.cs` —
  `using Microsoft.Extensions.Logging;` with no `PackageReference` in `Mozgoslav.Application.csproj`. Downstream: a
  cascade of List vs. IReadOnlyList mismatches between `LlmProcessingResult` (IReadOnlyList) and `ProcessedNote` (List),
  a Dapper-dependent `MeetilyImporterService` without the `Dapper` package referenced in central management or the
  Infrastructure csproj, a `Whisper.net` builder chain that hit the wrong type in the 1.9 API (`WithPrompt` lives on
  `WhisperProcessorBuilder`, not on `IWhisperSamplingStrategyBuilder`), and a `Combine<T>(List<T>, List<T>)` helper that
  no longer fit the IReadOnlyList signatures.
- **Backend tests used the wrong attributes.** One test file (`AudioFormatDetectorTests`) used xUnit `[Theory]` /
  `[InlineData]` against an MSTest project. Convention per `backend/CLAUDE.md` is MSTest — conversion to
  `[TestMethod]` / `[DataRow]` was applied.
- **Frontend TypeScript did not type-check.** Strict mode + `noUnusedLocals` tripped on every `import React, { … }`
  where `React` itself was not referenced; `Card`'s prop `title: ReactNode` collided with
  `HTMLAttributes<HTMLDivElement>.title: string`; `combineReducers<GlobalState>({ recording: recordingReducer })` +
  Redux 5 generic inference produced the "RecordingState is not assignable to undefined" cascade.
- **Frontend Jest was broken.** `jest.config.ts` demanded `ts-node` (not in deps). `@testing-library/dom` peer dep of
  `react@16` was not installed, so `screen` did not type-resolve even though Jest picked it up at runtime.
- **Frontend ESLint 9 could not load `.eslintrc.cjs`.** Requires flat `eslint.config.js`.
- **Frontend Vite build.** `vite-plugin-electron` requires `vite-plugin-electron-renderer` to load `renderer: {}` — the
  referenced plugin was not installed.
- **Python sidecar** was actually the most self-consistent piece — venv bootstrap + `requirements-dev.txt` + `pytest`
  worked on first try (8 tests).

### Architectural notes

- Clean Architecture split is correct on paper (Domain/Application/Infrastructure/Api) and DI composition lives in
  `Program.cs`. `Application` needed exactly one external package: `Microsoft.Extensions.Logging.Abstractions`.
- `Dapper` is legitimate here — it reads an **external** SQLite DB (Meetily's `meeting_minutes.sqlite`) via dynamic
  schema; EF Core is overkill for that path.
- `Whisper.net` 1.9 builder chain requires `WithPrompt` on the processor builder, and the beam size is set on the
  concrete `BeamSearchSamplingStrategyBuilder` returned from `WithBeamSearchSamplingStrategy()`.
- `ProcessedNote` stores mutable `List<T>` (EF Core column converters expect set-able collections).
  `LlmProcessingResult` record stores `IReadOnlyList<T>` (DDD immutability at the port boundary). Conversion via
  `.ToList()` at the construction site in both use-cases preserves both invariants.

## Production changes (Phase A stabilization)

| File                                                                              | Change                                                                                                    |
|-----------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------|
| `backend/Directory.Packages.props`                                                | Added `Dapper` central version (2.*).                                                                     |
| `backend/src/Mozgoslav.Application/Mozgoslav.Application.csproj`                  | Added `Microsoft.Extensions.Logging.Abstractions` package reference.                                      |
| `backend/src/Mozgoslav.Application/UseCases/ProcessQueueWorker.cs`                | `.ToList()` the IReadOnlyList results; added `using Mozgoslav.Domain.ValueObjects;` for `ActionItem`.     |
| `backend/src/Mozgoslav.Application/UseCases/ReprocessUseCase.cs`                  | Same.                                                                                                     |
| `backend/src/Mozgoslav.Infrastructure/Mozgoslav.Infrastructure.csproj`            | Added `Dapper` reference.                                                                                 |
| `backend/src/Mozgoslav.Infrastructure/Services/OpenAiCompatibleLlmService.cs`     | `Combine<T>` re-typed to `IReadOnlyList<T> -> IReadOnlyList<T>`.                                          |
| `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs` | Re-ordered builder chain — `WithPrompt` before sampling strategy; beam size set via concrete cast.        |
| `backend/tests/Mozgoslav.Tests/Domain/AudioFormatDetectorTests.cs`                | xUnit attrs → MSTest (`DataRow` + `TestMethod`).                                                          |
| `frontend/src/**/*.tsx`                                                           | Removed unused `React` import from 23 components.                                                         |
| `frontend/src/components/Card/Card.tsx`                                           | `extends Omit<HTMLAttributes<HTMLDivElement>, "title">` to allow `ReactNode` title.                       |
| `frontend/src/store/rootReducer.ts`                                               | Drop explicit generic on `combineReducers`; derive type from reducer output.                              |
| `frontend/src/store/index.ts`                                                     | Store type inferred from `createStore` return.                                                            |
| `frontend/src/store/slices/recording/reducer.ts`                                  | Reducer typed as `Reducer<RecordingState>`; payload access narrowed via local casts (Redux 5 compatible). |
| `frontend/jest.config.ts` → `jest.config.js`                                      | Avoid ts-node dependency.                                                                                 |
| `frontend/.eslintrc.cjs` → `frontend/eslint.config.js`                            | Flat config for ESLint 9.                                                                                 |
| `frontend/package.json`                                                           | Added `@eslint/js`, `@testing-library/dom`, `vite-plugin-electron-renderer` devDeps.                      |

## Tests written (Phase B — expansion)

Three new backend suites were added in `[tests]` commit (30 tests, all green on first run):

- `ProcessQueueWorkerTests` (10 tests) — fills the critical gap in Application-layer coverage. Covers: empty queue,
  happy-path pipeline, note versioning starting from 1 and incrementing past existing, LLM unavailable path that keeps
  the raw transcript, export failure still persists the note, empty vault path skips exporter, unknown recording and STT
  exception mark `Failed` without stalling the queue, `OperationCanceledException` propagates.
- `ApiEndpointsTests` (11 tests) — first smoke-level HTTP coverage through `WebApplicationFactory<Program>` and a temp
  SQLite file. One representative test per endpoint family: health, profiles (list / GET 404 / POST validation / POST
  create + GET by id), recordings (empty list / import validation / import missing file / import real file enqueues),
  jobs (empty list), settings (defaults).
- `OpenAiCompatibleLlmServiceTests` (9 tests) — WireMock-backed contract tests for the OpenAI-compatible client:
  `IsAvailableAsync` (200 / 500 / no-server), `ProcessAsync` (empty transcript / valid JSON / markdown-fenced JSON /
  non-JSON fallback to raw summary / server-error graceful degradation / unknown `conversation_type` falls back to
  `Other`).

Total backend coverage: 86 tests (41 unit + 45 integration), up from 56.

## Verification output (final)

```
$ dotnet restore -maxcpucount:1
All projects are up-to-date for restore.

$ dotnet build -maxcpucount:1 -nodeReuse:false -p:UseSharedCompilation=false --no-incremental
ok dotnet build: 7 projects, 0 errors, 0 warnings (00:00:28.83)

$ dotnet test -maxcpucount:1 --no-build --nologo
Passed!  - Failed:     0, Passed:    41, Skipped:     0, Total:    41 — Mozgoslav.Tests.dll
Passed!  - Failed:     0, Passed:    45, Skipped:     0, Total:    45 — Mozgoslav.Tests.Integration.dll

$ cd frontend
$ npm run typecheck   # clean
$ npm run lint        # clean
$ npm test -- --watchAll=false
Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
$ npm run build       # dist/ + dist-electron/ produced, 0 errors

$ cd ../python-sidecar
$ source .venv/bin/activate && pytest
============================== 8 passed in 0.03s ===============================
```

**DoD summary:** backend 86/86 green, frontend typecheck + lint + 6 tests + vite build all green, python 8/8 green. No
skipped tests outside explicitly-marked V2+ roadmap items (none encountered in this pass).

## Blockers

- **`git push` to `origin` is blocked at the remote.** The `mozgoslav.token` in
  `/home/coder/workspace/.persistent/github/` and the `gh` CLI token both lack the `contents: write` fine-grained
  permission for `AlexShchuka/mozgoslav`:
  ```
  $ curl -X POST -H "Authorization: token …" https://api.github.com/repos/AlexShchuka/mozgoslav/git/refs -d '{"ref":"refs/heads/test-perm-probe","sha":"fc86c4a…"}'
  {"message": "Resource not accessible by personal access token", "status": "403"}
  ```
  Branch `shuka/wire-everything-green` lives locally with three commits on top of `fc86c4a` but cannot be pushed until a
  token with write permission is provided. This is external to the code itself — all three commits are clean and ready.
- **Whisper.net runtime selection** in production requires macOS + `.mlmodelc` — out of scope on this Linux sandbox.

## UNVERIFIED

- `electron-builder --mac` packaging (requires macOS host).
- Real Whisper.net transcription round-trip (requires ggml model file; only verified that the builder chain compiles
  against the 1.9 API).
- Real LLM round-trip (requires reachable OpenAI-compatible endpoint).
- Real Meetily import (requires an actual `meeting_minutes.sqlite`).
