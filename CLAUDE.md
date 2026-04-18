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
│   └── adr/                            architecture decisions (ADR-014 living backlog; shipped ADRs in .archive/adrs/)
├── .archive/                           historical / superseded materials (ignore as source of truth)
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

## Active ADRs / планы

- `docs/adr/NEXT.md` — активная очередь работы (critical + quick wins).
- `docs/adr/POSTRELEASE.md` — задачи post-v1.0 (DMG auto-update, Linux/Windows билды).
- `docs/adr/ADR-014-unrealized-backlog.md` — living low-priority backlog.
- `docs/adr/ADR-016-rag-chat-history-persistence.md` — Proposed. Персист бесед с RAG.
- `docs/adr/ADR-017-backend-metrics-prometheus.md` — Proposed. `/metrics` Prometheus endpoint.

Все shipped/superseded ADR перенесены в `.archive/adrs/` (ADR-001…013, 015). Release plan v0.8 — в `.archive/docs/v0.8-release/`. Cancelled items с обоснованием — в `.archive/docs/backlog-cancelled-YYYY-MM-DD.md`.

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

- Apple Developer ID signing + notarisation (DMG ships unsigned in v0.8 — `.archive/docs/v0.8-release/07-dmg-and-release.md` §8).
- Web-aware RAG (groomed in archived `.archive/adrs/ADR-008-web-rag.md`).
- Calendar / meeting autostart.
- GigaAM-v3 STT integration (current STT: Whisper.cpp Tier 1 bundled + Tier 2 downloadable).
