# Mozgoslav — project guide for AI

macOS-first desktop second-brain. Electron + React UI ↔ ASP.NET Minimal API backend ↔ Python FastAPI ML sidecar ↔ Swift native layer.

## Rules (strict, global)

1. Docs are organized by feature under `docs/features/<name>/`. Each feature may have `decisions/` (shipped architectural decisions), `backlog/` (one file per deferred item), and `bugs/` (one file per known issue). Retire any of them by moving that file to `.archive/`. No central index files. No files that enumerate features.
2. Decisions are robot-readable: compact bullets, YAML frontmatter, concept-level only. No prose, no narrative, no file paths in the body.
3. `.archive/` is write-only scrap. Move superseded files in, flat. Never edit anything already inside.
4. No comments in code. No XML `///` summaries. No TODO/FIXME in committed code. Name things clearly instead.
5. No proprietary or third-party company references, no NDA material, no concrete usage-scenario descriptions, no "user" narrative voice. Write in terms of components, APIs, state.
6. Minimal diff. Prefer `git mv` over delete+create. Never rewrite a file just to reformat it.
7. All secrets live in the SQLite `settings` store, rendered with the sensitive-input primitive, never logged, never in environment variables.
8. Never bump package versions, add telemetry, or introduce backwards-compat shims unless explicitly asked.
9. Privacy posture is immutable: no outbound traffic except to endpoints explicitly configured in settings; no auto-update pings; no crash reporters; CSP grants only what is in use today.
10. One PR = one focused change. No drive-by refactors. Stop on ambiguity and ask.

## Anti-patterns (do-not catalogue)

Explicit do-nots, one line each with a concrete example. Agents pattern-match these faster than positive rules.

- Primary constructors in C# — `class Foo(IBar bar)` is banned; write explicit `readonly` field + traditional ctor instead.
- `//` / `/* */` comments in code — remove them; rename the symbol instead of annotating it.
- XML `///` summaries — banned on any production type or member; `CS1591` is suppressed precisely because XML docs should not exist.
- TODO / FIXME / HACK markers in committed code — open a backlog file under `docs/features/<feature>/backlog/` instead.
- Inline CSS — no `style={{ color: 'red' }}`; use `styled-components` and theme tokens.
- CSS modules / Tailwind / plain `.css` imports — only `styled-components` inside `src/`.
- React class components — function components + hooks only.
- Bare `fetch`/`axios` inside a component — go through `src/api/ApiFactory` and a per-domain client.
- Log statements that include secrets / tokens / passwords — render sensitive values via the `<Input sensitive />` primitive and never pass them to any logger.
- Blocking / synchronous calls inside a saga — use `call(effect, ...)` / `race` / `take` effects; never `await` a raw promise or call `.then`.
- Secrets stored in environment variables — use the SQLite `settings` store and the sensitive-input primitive; env vars are for paths and feature flags only.
- `#region` in C# — indicates a file that should be split.
- Hand-written frontend feature scaffolds — run `npm run plop` instead.

## Layout

```
mozgoslav/
├── backend/           C# 14 / .NET 10 ASP.NET Minimal API, EF Core SQLite, Serilog, OpenTelemetry
├── frontend/          Electron + React 19 + TS strict + Redux-Saga + styled-components + i18next
├── python-sidecar/    FastAPI app for ML endpoints (real + stubs)
├── native/            Swift macOS components built via Swift Package Manager
├── docs/features/     per-feature decisions + backlog (single source of truth)
├── scripts/           build and asset-fetch shell scripts
└── .archive/          flat dump of superseded files — ignore as source of truth
```

## Dev commands

| Task | Command |
|------|---------|
| Frontend dev | `cd frontend && npm run dev` |
| Frontend build | `cd frontend && npm run build` |
| Frontend typecheck | `cd frontend && npm run typecheck` |
| Frontend tests | `cd frontend && npm test` |
| Backend build | `cd backend && dotnet build -maxcpucount:1` |
| Backend tests | `cd backend && dotnet test -maxcpucount:1` |
| Scoped test | `dotnet test -maxcpucount:1 --filter "FullyQualifiedName~<Class>"` |
| Python sidecar | `cd python-sidecar && uvicorn app.main:app --host 127.0.0.1 --port 5060 --reload` |
| Python tests | `cd python-sidecar && pytest -q` |

## Architecture

```
Electron (main) ──▶ ASP.NET Minimal API (localhost:5050) ──▶ Whisper.net (CoreML on macOS)
     │                        │                                        │
     │  IPC / Net             │  HTTP                                  │  In-process C#
     ▼                        ▼                                        ▼
  native/ Swift          SQLite (EF Core)                        LLM endpoint (configured)
  (audio capture,       single file                              python-sidecar (optional)
   text injection)       EnsureCreatedAsync
```

Clean-architecture split inside `backend/src/`:

- `Mozgoslav.Domain` — entities, value objects, enums. Zero external deps.
- `Mozgoslav.Application` — use cases + port interfaces.
- `Mozgoslav.Infrastructure` — EF Core + repositories, external services.
- `Mozgoslav.Api` — DI composition root, endpoints, hosted services.

Frontend top-level:

- `electron/` — hardened window (contextIsolation, sandbox, CSP), IPC handlers, subprocess supervision.
- `src/api/` — BaseApi + ApiFactory + per-domain clients.
- `src/store/` — Redux + Saga slices; `recording` slice is the canonical reference.
- `src/features/` — container + presentational components, one folder per feature.
- `src/components/` — shared primitives.

## Cross-cutting patterns

- EF Core + SQLite via `EnsureCreatedAsync`. Not a migration tool — drop the db on schema changes in dev.
- `Channel<T>` fan-out → SSE for backend → renderer events. Non-blocking.
- Graceful degradation: optional external deps (LLM endpoint, sidecar, Obsidian REST) must never break the primary flow.
- Idempotent imports via sha256 content index.
- Background queue catches all exceptions; failed jobs mark `Failed`; the queue never stalls.
- Feature flags for optional integrations; default off on fresh installs.

## Backend conventions

- One class per file. No `#region`. No primary constructors — explicit `readonly` fields in traditional ctors.
- `sealed` on leaf classes. `internal` unless cross-project visibility is required.
- Central package management via `Directory.Packages.props` with exact pins on every package. Renovate opens weekly bump PRs. Central build props: `TargetFramework=net10.0`, `LangVersion=14`, `Nullable=enable`, `TreatWarningsAsErrors=true`.
- Tests: MSTest + FluentAssertions + NSubstitute. Integration tests spin real SQLite temp files via the shared test database.

## Frontend conventions

- Container + Presentational: `Foo.tsx` (props only) + `Foo.container.ts` (`connect(...)`).
- Store slices: `actions.ts` + `reducer.ts` + `mutations.ts` + `selectors.ts` + `saga/*.ts`.
- styled-components only. No inline CSS, Tailwind, CSS modules. Theme tokens in the shared theme module.
- Every user-facing string via `useTranslation` with keys in both `ru.json` and `en.json`.
- Tests: Jest + React Testing Library + `redux-saga-test-plan`.

## Extension points

- New backend service → interface in `Application/Interfaces/`, implementation in `Infrastructure/`, registration in the composition root.
- New backend endpoint → `Api/Endpoints/<Name>.cs` with `Map<Name>Endpoints()` extension, called from the composition root.
- New backend schema → update domain entities + `OnModelCreating`. Drop the local db on dev machines.
- New frontend feature → use the plop generator. Never hand-write the scaffold.
- New architectural decision → `docs/features/<feature>/decisions/<slug>.md` in robot style.
- New deferred item → `docs/features/<feature>/backlog/<slug>.md`, one concept per file. Move to `.archive/` when retired.
- New known bug → `docs/features/<feature>/bugs/<slug>.md`, one issue per file. Move to `.archive/` when the fix ships.

## Config & environment

| Setting | Location | Default |
|---------|----------|---------|
| Database path | Env `Mozgoslav:DatabasePath` or app data dir | `~/Library/Application Support/mozgoslav/db.sqlite` |
| Backend port | Hardcoded in the Electron main entry | `5050` |
| Whisper model | Settings UI → Models page | Must be downloaded first |
| Python sidecar base URL | Env `Mozgoslav:PythonSidecar:BaseUrl` | Disabled if unset |
