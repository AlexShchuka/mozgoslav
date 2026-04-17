# Mozgoslav — project guide for AI agents

> Агент, читающий этот CLAUDE.md: папку `.archive/` **игнорируй** — там устаревшие материалы. Не используй их как источник правды.

Локальный second-brain для разговоров. macOS-first desktop-app. Electron UI ↔ ASP.NET Minimal API backend ↔ Python FastAPI ML sidecar (real impl since v0.8).

## Layout

```
mozgoslav/
├── backend/           C# 14 / .NET 10 ASP.NET Minimal API, EF Core Sqlite, Serilog, OpenTelemetry metrics
├── frontend/          Electron + React 19 + TypeScript strict + Redux-Saga + styled-components + i18next
├── python-sidecar/    FastAPI app — diarize / NER (real, v0.8) + gender / emotion (downloadable, 503 envelope until model fetched)
├── docs/
│   ├── README.md                       what each piece does
│   └── adr/                            architecture decisions (008/009/010 active; .archive-v1/ + .archive-v2/ historical)
├── plan/v0.8/                          release plan, block-by-block
├── LICENSE            MIT
├── README.md          user-facing "install + first run on macOS"
└── CONTRIBUTING.md    developer setup (Rider, tests, lefthook, conventions)
```

## Key conventions

- One class per file. No primary constructors — traditional ctors with explicit `readonly` fields.
- `sealed` on leaf classes. `internal` where cross-project visibility isn't required.
- Central package management (`Directory.Packages.props`, floating-majors). Central build props (`Directory.Build.props`) — `TargetFramework=net10.0`, `LangVersion=14`, `Nullable enable`, `TreatWarningsAsErrors=true`.
- Tests: MSTest (`[TestClass]` / `[TestMethod]`) + FluentAssertions + NSubstitute. Integration tests spin real SQLite temp files via `TestDatabase` helper.
- Frontend: feature-based (Component + .style.ts + .container.ts + types.ts). Shared components live in `src/components/`. State in Redux+Saga store slices (recording slice is the canonical scaffold).
- No primary constructors in frontend (see `.editorconfig`). styled-components for all styling; zero inline CSS.
- `dotnet` commands always pass `-maxcpucount:1` (sandbox CPU rule).

## Active ADRs

- `docs/adr/ADR-008-web-rag.md` — groomed, NOT in v0.8.
- `docs/adr/ADR-009-production-readiness-no-stubs.md` — accepted, drives v0.8: real ML, no Noop fallbacks where prod expected.
- `docs/adr/ADR-010-bundled-russian-models.md` — accepted, drives v0.8: Tier 1 models bundled into DMG, Tier 2 downloadable (`ModelCatalog`).

Iteration-7 ADRs (007 family) shipped — archived in `docs/adr/.archive-v2/`.

## Privacy & security

- Electron: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Strict CSP set via `onHeadersReceived` (`default-src 'self'`, `connect-src 'self' localhost:5050 localhost:5173`).
- Kestrel binds to `localhost` only. CORS allows only localhost + `app://mozgoslav`.
- All secrets (LLM API key, Obsidian token) stay in the SQLite `settings` table — never transmitted outside the user-configured endpoint.
- Zero telemetry. No remote logging. No auto-update checks.

## Per-folder guides

- `backend/CLAUDE.md` — backend architecture, DI wiring, extension points.
- `frontend/CLAUDE.md` — React feature structure, store conventions, Electron bridge.
- `python-sidecar/CLAUDE.md` — FastAPI structure, real ML services, `ModelNotAvailableError` 503 envelope.

## Out of scope (Phase 2, not v0.8)

- Apple Developer ID signing + notarisation (DMG ships unsigned in v0.8 — `plan/v0.8/07-dmg-and-release.md` §8).
- Web-aware RAG (groomed in ADR-008).
- Calendar / meeting autostart.
- GigaAM-v3 STT integration (current STT: Whisper.cpp Tier 1 bundled + Tier 2 downloadable).
