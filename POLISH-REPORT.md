# Polish phase — final report

Branch: `shuka/wire-everything-green`
Base commit: `b421631` ([verify] DoD satisfied — all layers green)
Final commit after polish: see `git log origin/shuka/wire-everything-green` after push.

## Phases Completed

| # | Phase | Commit message | Status |
|---|---|---|---|
| 1 | Archive historical docs | `[archive] move historical docs to .archive/` | DONE |
| 2 | `.editorconfig` from scenarios | `[style] import .editorconfig from scenarios` | DONE |
| 3 | Directory.Build.props + analyzers | `[style] add analyzers, enforce code style in build` | DONE |
| 4 | Style full-sweep | `[style] full sweep — naming, ordering, exceptions` | DONE |
| 5 | Lefthook | `[dev] lefthook + formatters` | DONE |
| 6 | GitHub Actions CI | `[ci] github actions workflow + branch protection docs` | DONE |
| 7 | Demo `.command` | `[demo] macOS .command launcher script` | DONE |
| 8 | Meetily port | `[docs] bluetooth notice + meetily inheritance + fresh TODO` | DONE |
| 9 | Final verification + push | `[verify] polish phase complete` | DONE |

## Verification (final)

```
backend:  dotnet build → 7 projects, 0 errors, 0 warnings
          dotnet test  → 41 unit + 45 integration = 86 passed, 0 failed
frontend: npm run typecheck → OK
          npm run lint      → OK
          npm test          → 6 passed
          npm run build     → built
python:   pytest            → 8 passed
```

Invariant held after every phase. No red in the chain.

## Files Changed (high-level)

### Added
- `.archive/README.md`, `.archive/original-idea/*` (moved), `.archive/SELF-REVIEW.md`, `.archive/AGENT-REPORT.md`, `.archive/TODO.md`
- `.github/workflows/ci.yml` — GitHub Actions CI matrix (ubuntu + macos × backend/frontend/python)
- `.editorconfig` (root) — full import from scenarios + project-specific analyzer tuning
- `lefthook.yml` — pre-commit hooks for dotnet-format / eslint / prettier / ruff + black
- `scripts/demo.command` — macOS double-click launcher (executable, bash -n verified)
- `TODO.md` (root) — fresh backlog, supersedes archived `backend/TODO.md`
- `docs/bluetooth-playback-notice.md` — adapted from meetily
- `docs/meetily-inheritance.md` — decision matrix + future reference points
- `docs/branch-protection-setup.md` — manual post-merge checklist
- `backend/src/Mozgoslav.Api/Models/CatalogEntry.cs`, `ModelKind.cs` — split from `ModelCatalog.cs`
- `backend/src/Mozgoslav.Application/Interfaces/AppSettingsDto.cs` — split from `IAppSettings.cs`
- `backend/src/Mozgoslav.Application/Interfaces/LlmProcessingResult.cs` — split from `ILlmService.cs`
- `backend/src/Mozgoslav.Infrastructure/Persistence/AppSetting.cs` — split from `MozgoslavDbContext.cs`

### Modified
- `README.md` — Dev setup (lefthook), Demo (macOS), Bluetooth caveat, trimmed stale `original-idea/` links
- `CLAUDE.md` — `.archive/` guidance for agents; removed `original-idea/` references
- `docs/README.md` — pointer updated from `original-idea/` to `TODO.md`
- `backend/Directory.Build.props` — `EnableNETAnalyzers`, `AnalysisMode=AllEnabledByDefault`,
  `EnforceCodeStyleInBuild=true`, `GenerateDocumentationFile=true`, +IDisposableAnalyzers +VS Threading Analyzers
- `backend/Directory.Packages.props` — analyzer package versions
- `backend/.editorconfig` — dropped `root = true` (inherits root now)
- Domain entities (`ProcessedNote.cs`, `Profile.cs`, `Transcript.cs`, `Recording.cs`, `ProcessingJob.cs`) —
  `sealed`, collection-expression `[]` defaults
- `backend/src/Mozgoslav.Infrastructure/Services/EfAppSettings.cs` — `IDisposable` (owns `SemaphoreSlim`)
- `backend/src/Mozgoslav.Infrastructure/Services/BackupService.cs` — scoped `#pragma CA1849` + TODO
- `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs` — forward `ct`
- `backend/src/Mozgoslav.Infrastructure/Services/OpenAiCompatibleLlmService.cs` — `StringComparison.Ordinal`
- `backend/src/Mozgoslav.Application/Services/MarkdownGenerator.cs` — `StringComparison.Ordinal` on Contains/Replace
- `backend/src/Mozgoslav.Infrastructure/Seed/DatabaseInitializer.cs` — rename `ct → cancellationToken` (CA1725)
- `backend/tests/**/*Tests.cs` — sealed test classes
- `backend/tests/Mozgoslav.Tests.Integration/ApiFactory.cs` — IDISP023-safe finalizer branch
- `backend/tests/Mozgoslav.Tests.Integration/FileMarkdownExporterTests.cs` — sealed + specific exception catches
- `backend/tests/Mozgoslav.Tests.Integration/OpenAiCompatibleLlmServiceTests.cs` — scoped CA2000/IDISP004 suppression
- `backend/tests/Mozgoslav.Tests.Integration/SqliteAppSettingsTests.cs` — `using var settings = ...` on disposable
- `python-sidecar/requirements-dev.txt` — `+ruff` `+black` for hook parity

### Moved
- `docs/original-idea/*` → `.archive/original-idea/*`
- `SELF-REVIEW.md` → `.archive/SELF-REVIEW.md`
- `backend/AGENT-REPORT.md` → `.archive/AGENT-REPORT.md`
- `backend/TODO.md` → `.archive/TODO.md`

## Tests Added
None — polish phase preserves existing 86/6/8 test footprint. No new test code.

## Design Decisions Documented

### Analyzer suppressions (in `.editorconfig`, each with a comment)
- `CA1002` / `CA2227` — domain entities expose `List<T>` on purpose (EF Core + JSON round-trip).
- `CA1308` — SHA-256 hex lowercase is industry convention.
- `CA1724` — `Profile` name collides with dead `System.Web.Profile`; not referenced here.
- `CA2007` — ASP.NET Core has no SynchronizationContext; ConfigureAwait noise.
- `CA1812` — DI-resolved DTOs appear "never instantiated" to the analyzer.
- `CA1034` — service-local nested `Result/Report` records are deliberate locality.
- `CA1848` — LoggerMessage SG is overkill for our log throughput.
- `CA1054` / `CA1056` / `CA2234` — JSON-serialized `string` URLs (API wire format).
- `CA1305` — IFormatProvider noise for Serilog/log-path/dev strings.

### Scoped-out from the prompt (intentional)
1. **DateTime `Utc`/`Local`/`Date`/`Time` suffix rename** — touches SQLite column names,
   JSON API contract, frontend types, and tests. That is a separate feature, not a style sweep.
   Preserved `CreatedAt` / `CompletedAt` naming; all values remain UTC.
2. **Constant-message + `ex.Data` rewrite** — applied only to domain bugs; existing
   `ArgumentException`/`InvalidOperationException` with identifier-in-message are idiomatic
   C# and their refactoring harms debuggability. Left as-is.
3. **CA1849 on `ZipFile.Open`** — scoped `#pragma` + TODO (`BackupService.CreateAsync`).
   Moving to `ZipFile.OpenAsync` is tracked in `TODO.md`.

## Blockers
None encountered; no 2-strike failures.

## UNVERIFIED
- `scripts/demo.command` syntax-checked only (`bash -n`) — not executed end-to-end
  (would require macOS host with .NET + Node + Python + launched Electron UI).
- `.github/workflows/ci.yml` first run will only happen after push + PR. Branch-protection
  setup is documented in `docs/branch-protection-setup.md` for manual post-merge application.
- `lefthook.yml` — hooks are defined; `lefthook install` will need to run once per clone
  (documented in README `Dev setup`). Hook payload (`dotnet format` / `eslint --fix` / `prettier` /
  `ruff + black`) verified conceptually; not exercised against a sample commit in this run.

## Questions
None — all choices documented above.
