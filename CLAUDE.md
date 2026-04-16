# Mozgoslav — project guide for AI agents

> Агент, читающий этот CLAUDE.md: папку `.archive/` **игнорируй** — там устаревшие материалы. Не используй их как источник правды.

Локальный second-brain для разговоров. macOS-first desktop-app. Electron UI ↔ ASP.NET Minimal API backend ↔ Python FastAPI ML sidecar (V3).

## Layout

```
mozgoslav/
├── backend/           C# 14 / .NET 10 ASP.NET Minimal API, EF Core Sqlite, Serilog, OpenTelemetry metrics
├── frontend/          Electron + React 19 + TypeScript strict + Redux-Saga + styled-components + i18next
├── python-sidecar/    FastAPI app (V3 ML endpoints — stubs today)
├── docs/
│   └── README.md                       what each piece does
├── LICENSE            MIT
└── README.md          user-facing "how to run on macOS"
```

## Key conventions

- One class per file. No primary constructors — traditional ctors with explicit `readonly` fields.
- `sealed` on leaf classes. `internal` where cross-project visibility isn't required.
- Central package management (`Directory.Packages.props`, floating-majors). Central build props (`Directory.Build.props`) — `TargetFramework=net10.0`, `LangVersion=14`, `Nullable enable`, `TreatWarningsAsErrors=true`.
- Tests: MSTest (`[TestClass]` / `[TestMethod]`) + FluentAssertions + NSubstitute. Integration tests spin real SQLite temp files via `TestDatabase` helper.
- Frontend: feature-based (Component + .style.ts + .container.ts + types.ts). Shared components live in `src/components/`. State in Redux+Saga store slices (recording slice is the canonical scaffold).
- No primary constructors in frontend (see `.editorconfig`). styled-components for all styling; zero inline CSS.

## Privacy & security

- Electron: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Strict CSP set via `onHeadersReceived` (`default-src 'self'`, `connect-src 'self' localhost:5050 localhost:5173`).
- Kestrel binds to `localhost` only. CORS allows only localhost + `app://mozgoslav`.
- All secrets (LLM API key, Obsidian token) stay in the SQLite `settings` table — never transmitted outside the user-configured endpoint.
- Zero telemetry. No remote logging. No auto-update checks.

## Per-folder guides

- `backend/CLAUDE.md` — backend architecture, DI wiring, extension points.
- `frontend/CLAUDE.md` — React feature structure, store conventions, Electron bridge.
- `python-sidecar/CLAUDE.md` — FastAPI structure, V3 stubs, how to flesh out ML services.

## Out of scope (today)

- Real ML in sidecar (diarization / gender / emotion / NER). Stubs only — implement when downloading models.
- Live transcription, speaker-based aggregated notes, PARA routing — roadmap in `TODO.md`.
- macOS `IAudioRecorder` (native mic capture) — interface present, `NoopAudioRecorder` is the fallback.
- `electron-builder --mac` packaging — requires macOS host; config ready, not executed in CI.
