# Mozgoslav — operating manual for AI coding agents

macOS-first desktop second-brain. Electron + React UI ↔ ASP.NET Minimal API backend ↔ Python FastAPI ML sidecar ↔ Swift native layer.

This file is the contract between the repo and any autonomous coding agent working in it. Critical rules come first; scroll to the end only for trivia.

---

## 1. Non-negotiable rules

1. **Backlog, bugs, and decisions live as GitHub Issues.** Labels: `feature/<name>` + `type/backlog|bug|decision` + optional `status/*`. Filesystem `docs/features/<name>/{backlog,bugs,decisions}/*.md` is retired; adding one fails CI (`backlog-guard`). Re-run migration with `scripts/migrate-docs-to-issues.sh`.
2. **One PR = one focused change.** Stop on ambiguity and ask. Drive-by refactors, surprise renames, and opportunistic version bumps are rejected on review.
3. **No human-style comments in code.** No `//` / `/* */` prose. No XML `///` summaries (`CS1591` is suppressed precisely because XML docs must not exist). No `TODO` / `FIXME` / `HACK` — open an Issue with `type/backlog` + `feature/<name>` labels instead. CI runs `uncomment --dry-run` and fails the PR on any comment drift. Rename the symbol instead of annotating it.
4. **No package-version bumps, no telemetry, no backwards-compat shims** unless the task explicitly asks. Renovate owns dependency updates.
5. **Privacy posture is immutable.** No outbound traffic except to endpoints the user configured in settings. No auto-update pings, no crash reporters, no analytics. CSP grants only what is in use today.
6. **Secrets live in the SQLite `settings` store** and render through the `<Input sensitive />` primitive. Never log secrets. Never put secrets in env vars (env vars are for paths and feature flags).
7. **Minimal diff.** Prefer `git mv` over delete+create. Never rewrite a file just to reformat it. Don't touch unrelated files.
8. **Never push from an agent session.** The `pre-push` lefthook refuses push unless `MOZGOSLAV_HUMAN_PUSH=1` is set. Open local branches; a human operator runs `MOZGOSLAV_HUMAN_PUSH=1 git push`.
9. **`type/decision` Issues stay robot-style.** Compact bullets, concept-level, no file paths in the body. Prose kills signal.
10. **`.archive/` is write-only.** Move superseded files in, flat. Never edit anything already inside.

## 2. Anti-pattern catalogue (pattern-match these fast)

One-liner bans. Each has a concrete example so the pattern is unmistakable.

- **Primary constructors in C# are banned** — `class Foo(IBar bar)` → write explicit `readonly` field + traditional ctor.
- **Inline CSS is banned** — `style={{ color: 'red' }}` → use `styled-components` with theme tokens.
- **CSS modules / Tailwind / plain `.css` imports banned inside `src/`** — only `styled-components`.
- **React class components banned** — function components + hooks.
- **Bare `fetch` / `axios` inside a component banned** — go through the GraphQL client (`src/api/graphqlClient`) or a per-domain saga.
- **Blocking `await` inside a saga banned** — use `call(...)` / `race` / `take` effects.
- **Secrets in env vars banned** — SQLite `settings` store + sensitive-input primitive.
- **`#region` banned in C#** — it signals a file that should be split.
- **Hand-written frontend feature scaffolds banned** — run `npm run plop`.
- **Magic colour literals in styled-components banned** — add a token to `frontend/src/styles/theme.ts` and reference it as `theme.colors.*`.

## 3. Commands (copy-paste, exact)

### Frontend

```bash
cd frontend
npm ci
npm run dev                  # vite dev server
npm run build                # tsc --noEmit && vite build && codegen
npm run typecheck
npm run lint
npm run check-styles
npm run check-translations
npx prettier --check "src/**/*.{ts,tsx,css}" "electron/**/*.ts"
npm test -- --watchAll=false
```

### Backend

```bash
cd backend
dotnet restore Mozgoslav.sln -maxcpucount:1
dotnet build   Mozgoslav.sln -maxcpucount:1 -warnaserror
dotnet format  Mozgoslav.sln --verify-no-changes --verbosity minimal
dotnet test    tests/Mozgoslav.Tests/Mozgoslav.Tests.csproj             --settings UnitTests.runsettings
dotnet test    tests/Mozgoslav.Tests.Integration/Mozgoslav.Tests.Integration.csproj --settings IntegrationTests.runsettings

# Scoped run while iterating:
dotnet test --filter "FullyQualifiedName~<Class>" -maxcpucount:1
```

### Python sidecar

```bash
cd python-sidecar
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
ruff check .
black --check .
pytest -q
```

### Native (macOS only)

```bash
cd native/MozgoslavDictationHelper
swift build -c release
swift test
```

### Distribution

```bash
bash scripts/publish-backend-osx.sh   # self-contained dotnet publish → frontend/resources/backend/
cd frontend && npm run dist:mac       # full .dmg pipeline (fetch models → publish backend → vite → helper → electron-builder)
```

## 4. Testing discipline

- **No change ships without the matching test.** New public behaviour = new test; bug fix = regression test that fails before the fix and passes after.
- **Integration tests** use real SQLite temp files via the shared test database fixture. Don't mock EF Core.
- **Unit tests** run in parallel; must be deterministic, <100 ms each, no clock / file I/O / network.
- **Snapshot tests** (Snapshooter) gate schema — `backend/tests/Mozgoslav.Tests.Schema/__snapshots__/`. Schema changes require a deliberate snapshot update.
- **Coverage floor** is 1% line rate per cobertura report, enforced by CI. Don't ship below the floor.
- **Frontend sagas** use `redux-saga-test-plan`. Mock the GraphQL client, not transport primitives.

## 5. Canonical patterns (pointers to real files)

Don't invent patterns — match the canonical example.

| Concern | Reference |
|---|---|
| Redux slice (actions/reducer/mutations/selectors/saga) | `frontend/src/store/slices/recording/` |
| Feature folder layout (container + presentational + tests) | `frontend/src/features/RecordingList/` |
| Shared UI primitive | `frontend/src/components/Button/` |
| Theme token usage | `frontend/src/components/Badge/Badge.style.ts` |
| Electron subprocess supervisor | `frontend/electron/utils/backendLauncher.ts` |
| GraphQL query extension | `backend/src/Mozgoslav.Api/GraphQL/Health/HealthQueryType.cs` |
| GraphQL mutation with `UserError` | `backend/src/Mozgoslav.Api/GraphQL/Settings/SettingsMutationType.cs` |
| Application-layer use case | `backend/src/Mozgoslav.Application/UseCases/ReprocessUseCase.cs` |
| Integration test with real SQLite | `backend/tests/Mozgoslav.Tests.Integration/` |

## 6. Architecture snapshot

```
Electron (main) ──▶ ASP.NET Minimal API (localhost:5050) ──▶ Whisper.net (CoreML on macOS)
     │                        │                                        │
     │  IPC / Net             │  GraphQL + SSE                         │  In-process C#
     ▼                        ▼                                        ▼
  native/ Swift          SQLite (EF Core)                        LLM endpoint (user-configured)
  (audio capture,       single file                              python-sidecar (optional)
   text injection)       EnsureCreatedAsync
```

Backend layering (strict):

- `Mozgoslav.Domain` — entities, value objects, enums. Zero external deps.
- `Mozgoslav.Application` — use cases + port interfaces.
- `Mozgoslav.Infrastructure` — EF Core repositories, HTTP clients, external services.
- `Mozgoslav.Api` — DI composition root, GraphQL schema, hosted services.

Frontend layering:

- `electron/` — hardened window, IPC, subprocess supervision.
- `src/api/` — GraphQL client + typed ops generated by codegen.
- `src/store/` — Redux + Saga slices; `recording` is the canonical reference.
- `src/features/` — one folder per feature (container + presentational).
- `src/components/` — shared primitives. Add here before adding feature-local.

## 7. Extension points

- **New backend service** → interface in `Application/Interfaces/`, implementation in `Infrastructure/`, registration in the composition root.
- **New GraphQL query/mutation** → `[ExtendObjectType(typeof(QueryType|MutationType))]` in the matching folder, then `AddTypeExtension<...>` in `QueryRegistration` / `MutationRegistration`.
- **New backend schema** → update domain entities + `OnModelCreating`. Drop the local `mozgoslav.db` on dev machines. `EnsureCreatedAsync` is not a migration tool.
- **New frontend feature** → `npm run plop`. Never hand-scaffold.
- **New architectural decision** → open an Issue with `type/decision` + `feature/<name>` labels; body is robot-style.
- **New deferred item** → open an Issue with `type/backlog` + `feature/<name>`.
- **New known bug** → open an Issue with `type/bug` + `feature/<name>`.

## 8. Config & environment

| Setting | Location | Default |
|---|---|---|
| Database path | Env `Mozgoslav:DatabasePath` or app data dir | `~/Library/Application Support/mozgoslav/db.sqlite` |
| Backend port | Hardcoded in the Electron main entry | `5050` |
| Whisper model | Settings UI → Models page | Must be downloaded first |
| Python sidecar base URL | Env `Mozgoslav:PythonSidecar:BaseUrl` | Disabled if unset |
| Bundled backend binary (packaged) | `process.resourcesPath/backend/Mozgoslav.Api` | Published by `scripts/publish-backend-osx.sh` |
| Prometheus scrape | `GET http://localhost:5050/metrics` | Always on; loopback only. Exporter = `AddPrometheusExporter()` + `MapPrometheusScrapingEndpoint()` in `Program.cs`. |

## 9. When the agent is stuck

- Build fails → read the full error; don't retry silently. If the error comes from an unrelated file, revert your diff and re-run scoped.
- Test fails → reproduce with the scoped-test command. If flaky (passes on retry, no code change), stop and open a `type/bug` Issue with `flaky-test` in the title; don't retry-until-green.
- A rule above seems to contradict the task → follow the rule, annotate the tension in the PR description, and surface the conflict. Don't silently override.
- Something feels irreversible (`rm -rf`, force push, drop table, close an issue you didn't open) → stop and ask the human operator.

## 10. Per-directory overrides

- `frontend/CLAUDE.md` — frontend-specific conventions, commands, plop.
- `backend/CLAUDE.md` — backend conventions, layering, test conventions.
- `python-sidecar/CLAUDE.md` / `native/CLAUDE.md` — scoped context where present.

Per-directory files narrow this file — they never contradict the non-negotiable rules above.
