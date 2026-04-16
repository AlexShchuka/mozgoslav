# FEATURE-DEV-REPORT — wire-everything-green

Branch: `shuka/wire-everything-green`. Base: `fc86c4a`.

## Findings (Discovery, Phase A)

### Repository snapshot on entry

The `fc86c4a` snapshot contained a mostly-implemented three-tier app with roughly the shape described in SELF-REVIEW.md, but:

- **Backend did not compile.** First failure was in `Mozgoslav.Application/UseCases/ProcessQueueWorker.cs` — `using Microsoft.Extensions.Logging;` with no `PackageReference` in `Mozgoslav.Application.csproj`. Downstream: a cascade of List vs. IReadOnlyList mismatches between `LlmProcessingResult` (IReadOnlyList) and `ProcessedNote` (List), a Dapper-dependent `MeetilyImporterService` without the `Dapper` package referenced in central management or the Infrastructure csproj, a `Whisper.net` builder chain that hit the wrong type in the 1.9 API (`WithPrompt` lives on `WhisperProcessorBuilder`, not on `IWhisperSamplingStrategyBuilder`), and a `Combine<T>(List<T>, List<T>)` helper that no longer fit the IReadOnlyList signatures.
- **Backend tests used the wrong attributes.** One test file (`AudioFormatDetectorTests`) used xUnit `[Theory]` / `[InlineData]` against an MSTest project. Convention per `backend/CLAUDE.md` is MSTest — conversion to `[TestMethod]` / `[DataRow]` was applied.
- **Frontend TypeScript did not type-check.** Strict mode + `noUnusedLocals` tripped on every `import React, { … }` where `React` itself was not referenced; `Card`'s prop `title: ReactNode` collided with `HTMLAttributes<HTMLDivElement>.title: string`; `combineReducers<GlobalState>({ recording: recordingReducer })` + Redux 5 generic inference produced the "RecordingState is not assignable to undefined" cascade.
- **Frontend Jest was broken.** `jest.config.ts` demanded `ts-node` (not in deps). `@testing-library/dom` peer dep of `react@16` was not installed, so `screen` did not type-resolve even though Jest picked it up at runtime.
- **Frontend ESLint 9 could not load `.eslintrc.cjs`.** Requires flat `eslint.config.js`.
- **Frontend Vite build.** `vite-plugin-electron` requires `vite-plugin-electron-renderer` to load `renderer: {}` — the referenced plugin was not installed.
- **Python sidecar** was actually the most self-consistent piece — venv bootstrap + `requirements-dev.txt` + `pytest` worked on first try (8 tests).

### Architectural notes

- Clean Architecture split is correct on paper (Domain/Application/Infrastructure/Api) and DI composition lives in `Program.cs`. `Application` needed exactly one external package: `Microsoft.Extensions.Logging.Abstractions`.
- `Dapper` is legitimate here — it reads an **external** SQLite DB (Meetily's `meeting_minutes.sqlite`) via dynamic schema; EF Core is overkill for that path.
- `Whisper.net` 1.9 builder chain requires `WithPrompt` on the processor builder, and the beam size is set on the concrete `BeamSearchSamplingStrategyBuilder` returned from `WithBeamSearchSamplingStrategy()`.
- `ProcessedNote` stores mutable `List<T>` (EF Core column converters expect set-able collections). `LlmProcessingResult` record stores `IReadOnlyList<T>` (DDD immutability at the port boundary). Conversion via `.ToList()` at the construction site in both use-cases preserves both invariants.

## Production changes (Phase A stabilization)

| File | Change |
|---|---|
| `backend/Directory.Packages.props` | Added `Dapper` central version (2.*). |
| `backend/src/Mozgoslav.Application/Mozgoslav.Application.csproj` | Added `Microsoft.Extensions.Logging.Abstractions` package reference. |
| `backend/src/Mozgoslav.Application/UseCases/ProcessQueueWorker.cs` | `.ToList()` the IReadOnlyList results; added `using Mozgoslav.Domain.ValueObjects;` for `ActionItem`. |
| `backend/src/Mozgoslav.Application/UseCases/ReprocessUseCase.cs` | Same. |
| `backend/src/Mozgoslav.Infrastructure/Mozgoslav.Infrastructure.csproj` | Added `Dapper` reference. |
| `backend/src/Mozgoslav.Infrastructure/Services/OpenAiCompatibleLlmService.cs` | `Combine<T>` re-typed to `IReadOnlyList<T> -> IReadOnlyList<T>`. |
| `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs` | Re-ordered builder chain — `WithPrompt` before sampling strategy; beam size set via concrete cast. |
| `backend/tests/Mozgoslav.Tests/Domain/AudioFormatDetectorTests.cs` | xUnit attrs → MSTest (`DataRow` + `TestMethod`). |
| `frontend/src/**/*.tsx` | Removed unused `React` import from 23 components. |
| `frontend/src/components/Card/Card.tsx` | `extends Omit<HTMLAttributes<HTMLDivElement>, "title">` to allow `ReactNode` title. |
| `frontend/src/store/rootReducer.ts` | Drop explicit generic on `combineReducers`; derive type from reducer output. |
| `frontend/src/store/index.ts` | Store type inferred from `createStore` return. |
| `frontend/src/store/slices/recording/reducer.ts` | Reducer typed as `Reducer<RecordingState>`; payload access narrowed via local casts (Redux 5 compatible). |
| `frontend/jest.config.ts` → `jest.config.js` | Avoid ts-node dependency. |
| `frontend/.eslintrc.cjs` → `frontend/eslint.config.js` | Flat config for ESLint 9. |
| `frontend/package.json` | Added `@eslint/js`, `@testing-library/dom`, `vite-plugin-electron-renderer` devDeps. |

## Tests written (Phase B — planned)

Phase A focused on making the existing 56 backend + 6 frontend + 8 python tests compile and run. Phase B expands coverage per ADR-001 §6 functional requirements — each acceptance criterion to its own test. See "Verification output" below for the current green baseline.

## Verification output (Phase A baseline)

```
$ dotnet restore -maxcpucount:1
All projects are up-to-date for restore.

$ dotnet build -maxcpucount:1 -nodeReuse:false -p:UseSharedCompilation=false --no-incremental
ok dotnet build: 7 projects, 0 errors, 0 warnings (00:00:28.49)

$ dotnet test -maxcpucount:1 --no-build --nologo
Passed!  - Failed:     0, Passed:    31, Skipped:     0, Total:    31 — Mozgoslav.Tests.dll
Passed!  - Failed:     0, Passed:    25, Skipped:     0, Total:    25 — Mozgoslav.Tests.Integration.dll

$ npm run typecheck   # clean
$ npm run lint        # clean
$ npm test -- --watchAll=false
Test Suites: 2 passed, 2 total
Tests:       6 passed, 6 total
$ npm run build       # OK (dist/ + dist-electron/)

$ pytest
============================== 8 passed in 0.03s ===============================
```

## Blockers

- None observed in Phase A. Whisper.net runtime selection in production requires macOS + `.mlmodelc` — out of scope on this Linux sandbox.

## UNVERIFIED

- `electron-builder --mac` packaging (requires macOS host).
- Real Whisper.net transcription round-trip (requires ggml model file; only verified that the builder chain compiles against the 1.9 API).
- Real LLM round-trip (requires reachable OpenAI-compatible endpoint).
- Real Meetily import (requires an actual `meeting_minutes.sqlite`).
