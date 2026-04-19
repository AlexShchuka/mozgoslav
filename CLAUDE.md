# Mozgoslav — project guide for AI

> Читающий этот CLAUDE.md: папку `.archive/` **игнорируй** — там устаревшие материалы. Не используй их как
> источник правды. Не читай эту папку.

Локальный second-brain для разговоров. macOS-first desktop-app. Electron UI ↔ ASP.NET Minimal API backend ↔ Python
FastAPI ML sidecar (real impl since v0.8).

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
- Central package management (`Directory.Packages.props`, floating-majors). Central build props (
  `Directory.Build.props`) — `TargetFramework=net10.0`, `LangVersion=14`, `Nullable enable`,
  `TreatWarningsAsErrors=true`.
- Tests: MSTest (`[TestClass]` / `[TestMethod]`) + FluentAssertions + NSubstitute. Integration tests spin real SQLite
  temp files via `TestDatabase` helper.
- Frontend: feature-based (Component + .style.ts + .container.ts + types.ts). Shared components live in
  `src/components/`. State in Redux+Saga store slices (recording slice is the canonical scaffold).
- No primary constructors in frontend (see `.editorconfig`). styled-components for all styling; zero inline CSS.
- NO COMMENTS!
