# ADR-007 — Shared conventions and API contract

Read-only reference for every agent. Master ADR: `ADR-007.md`.

This file defines:

1. Conventions that are the same everywhere (test frameworks, fixture patterns, red-first contract).
2. The **API contract** between Phase-2 agents — endpoints with request / response shapes. Fix at end of Phase 1, do not
   drift in Phase 2.
3. Quality bar and escalation.
4. Skills agents may use.

---

## 1. Absolute conventions (restated for contract clarity)

### 1.1 Build / test commands (always pass `-maxcpucount:1`)

```bash
# From /home/coder/workspace/mozgoslav-20260417/mozgoslav/

# Backend — build & test
dotnet build backend/Mozgoslav.sln -c Debug   -maxcpucount:1
dotnet build backend/Mozgoslav.sln -c Release -maxcpucount:1
dotnet test  backend/Mozgoslav.sln            -maxcpucount:1 --no-restore

# Frontend — install, typecheck, lint, test, build
cd frontend && npm install                               # run once
npm --prefix frontend run typecheck
npm --prefix frontend run lint
npm --prefix frontend test
npm --prefix frontend run build
cd ..

# Python sidecar
cd python-sidecar
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python -m pytest -q
deactivate && cd ..

# Swift helper — sandbox has no Swift. Agent produces source only.
# Validation happens on user's macOS host with:
#   swift test --package-path helpers/MozgoslavDictationHelper
```

### 1.2 Backend C# conventions (authoritative — do not diverge)

- `TargetFramework=net10.0`, `LangVersion=14`, `Nullable enable`, `TreatWarningsAsErrors=true`.
- Central package management via `Directory.Packages.props` (floating-majors). Central build props in
  `Directory.Build.props`.
- **No primary constructors.** Always traditional:
  ```csharp
  public sealed class Foo : IFoo
  {
      private readonly IBar _bar;
      private readonly IBaz _baz;

      public Foo(IBar bar, IBaz baz)
      {
          _bar = bar;
          _baz = baz;
      }
  }
  ```
- `sealed` on leaf classes. `internal` where cross-project visibility is not required. One class per file.
- Minimal API is the project style **except** `LogsController : ControllerBase` (ADR-007 D5).
- DI composition root is `Program.cs`. Every new service registers there.

### 1.3 Backend tests

- **Unit** in `backend/tests/Mozgoslav.Tests/<Layer>/<Class>Tests.cs` where `<Layer>` ∈
  `Domain | Application | Infrastructure | UseCases`.
- **Integration** in `backend/tests/Mozgoslav.Tests.Integration/<FeatureOrEndpoint>Tests.cs`. Entry point is existing
  `ApiFactory`. Temp SQLite via existing `TestDatabase` helper.
- MSTest (`[TestClass]` / `[TestMethod]`) + **FluentAssertions** + **NSubstitute**.
- Outbound HTTP: **WireMock.Net** (LM Studio `/v1/models`, `/v1/chat/completions`; Anthropic `/v1/messages`; Ollama
  `/api/chat`; Syncthing REST; Obsidian REST).
- Testcontainers: `syncthing/syncthing:latest` for **BC-048, BC-049** only. WireMock first preference elsewhere.
- Filesystem paths: `Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"))` per test.
- **Never hit the real network.** Not HuggingFace. Not openai.com. Not your LM Studio.

### 1.4 Frontend TS conventions

- TypeScript strict. Zero `any` without justifying comment.
- **styled-components** only; no CSS modules, no Tailwind. Tokens in `frontend/src/styles/theme.ts`.
- Feature layout:
  `frontend/src/features/<Feature>/{Component.tsx, Component.container.ts, Component.style.ts, types.ts}`.
- Shared components in `frontend/src/components/`.
- Store slice pattern: `actionCreator.ts` + `reducer.ts` + `mutations.ts` + `selectors.ts` + `saga/*.ts`. Canonical ref:
  `slices/recording`.
- `i18n` — every user-facing string goes through `useTranslation`. Add keys to `ru.json` and `en.json` both.
- Default exports for components, named exports for utilities / selectors / types.
- No primary-constructor analogue; there is no shared override for TypeScript's shortened constructor syntax — default
  TS.

### 1.5 Frontend tests

- Jest + React Testing Library + `redux-saga-test-plan`.
- Feature tests co-located: `frontend/src/features/<Feature>/__tests__/<File>.test.tsx`.
- Electron main-process tests: `frontend/__tests__/electron/<File>.test.ts` — mock `electron` via
  `jest.mock("electron", () => ({ BrowserWindow, Tray, ipcMain, dialog, shell }))`.
- Theme / styles snapshot: `frontend/__tests__/styles/<Name>.test.ts`.
- Hooks: `frontend/__tests__/hooks/<Hook>.test.ts`.
- Perf: `frontend/__tests__/perf/<Scenario>.test.tsx`.
- HTTP mocks: `jest.spyOn(global, 'fetch')` with typed resolved values OR `msw` if already present in
  `frontend/package.json`.

### 1.6 Electron conventions (inside `frontend/`)

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- Strict CSP via `onHeadersReceived` — `default-src 'self'`, `connect-src 'self' localhost:5050 localhost:5173`.
- IPC whitelist via `contextBridge` exposed as `window.mozgoslav`. New bridge method = edit both `preload.ts` and
  `main.ts` (`ipcMain.handle`).
- Local dev: webpack/vite watches. Kubernetes pod requires polling — **set `WATCHPACK_POLLING=true` in `frontend/.env`**
  before running the dev server.

### 1.7 Python sidecar conventions

- `.python-version` = 3.11.
- FastAPI + pydantic-settings. Routers in `app/routers/`. Services in `app/services/`. Schemas in `app/models/`.
- Tests: pytest + `fastapi.testclient.TestClient` under `python-sidecar/tests/test_<name>.py`.
- `requirements.txt` = production (heavy ML). `requirements-dev.txt` = lightweight dev set (fastapi, uvicorn[standard],
  pytest, httpx, pydantic≥2).
- **Do not silently install new deps.** Flag in the agent report if a BC genuinely needs one.

### 1.8 Swift helper conventions

- XCTest under `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/<Name>Tests.swift`.
- Sandbox has **no Swift**. Agent writes source only. Validation on user's macOS host with `swift test`.
- Target declared in `helpers/MozgoslavDictationHelper/Package.swift`. Do not modify `Package.swift` except to add the
  test target if missing.
- Electron ↔ helper IPC is newline-JSON over stdio (`DictationHelperCoreTests/JsonRpcTests.swift` has the fixture
  pattern).

---

## 2. API contract (Phase-1 output, Phase-2 input)

Every endpoint below is frozen after Phase 1. Backend agent implements the request / response shape; Frontend agent
calls exactly this shape. Do not drift.

Prefix: `http://127.0.0.1:5050`.

### 2.1 Existing endpoints (unchanged — verify in Phase 1)

```
GET    /api/health
GET    /api/health/llm
GET    /api/recordings
GET    /api/recordings/{id}
POST   /api/recordings/import       { filePaths[], profileId? }
POST   /api/recordings/upload       (multipart)
POST   /api/recordings/{id}/reprocess { profileId }
GET    /api/recordings/{id}/notes
GET    /api/jobs | /api/jobs/active
GET    /api/jobs/stream             (SSE)
POST   /api/jobs                    { recordingId, profileId }
DELETE /api/queue/{id}              → 204 / 200 / 409 / 404
GET    /api/notes | /api/notes/{id}
POST   /api/notes/{id}/export
GET    /api/profiles | /api/profiles/{id}
POST   /api/profiles | PUT /api/profiles/{id}
DELETE /api/profiles/{id}
GET    /api/settings | PUT /api/settings
GET    /api/models
POST   /api/meetily/import          { meetilyDatabasePath }
POST   /api/obsidian/setup          { vaultPath? }
GET    /api/backup | POST /api/backup/create
```

### 2.2 Rewritten in Phase 1 (LogsController MVC)

```
GET    /api/logs                     → [{ fileName, sizeBytes, lastModifiedUtc }]
GET    /api/logs/tail?file=<name>&lines=<n>
                                     → { file, lines: [string], totalLines }
```

### 2.3 Restored in Phase 1 (model download + SSE)

```
POST   /api/models/download          { catalogueId }
                                     → 202 Accepted + { downloadId }
GET    /api/models/download/stream   (SSE)
                                     event: progress
                                     data:  { downloadId, bytesRead, totalBytes, done, error? }
```

### 2.4 Restored / added in Backend MR C (RAG)

```
POST   /api/rag/reindex              { } (no body required)
                                     → { embeddedNotes: int, chunks: int }
POST   /api/rag/query                { question, topK? = 5 }
                                     → { answer: string,
                                         citations: [
                                             { noteId, segmentId, text, snippet }
                                         ]
                                       }
```

### 2.5 Restored / added in Backend MR D (Syncthing)

```
GET    /api/sync/status              → { folders: [{ id, completion, state }],
                                         devices: [{ id, name, connected, lastSeen }] }
GET    /api/sync/health              → { running, port, ready }
GET    /api/sync/pairing-payload     → { uri: "mozgoslav://pair/..." }
POST   /api/sync/accept-device       { deviceId, name, folderIds? }
GET    /api/sync/events              (SSE bridge over /rest/events)
```

### 2.6 Added in Backend MR B (UX coherence backends)

```
POST   /api/notes                    { title?, body?, templateId? }
                                     → 201 + ProcessedNote { source: "Manual" }
POST   /api/obsidian/export-all      { }
                                     → { exportedCount: int,
                                         skippedCount: int,
                                         failures: [{ noteId, reason }] }
POST   /api/obsidian/apply-layout    { }
                                     → { createdFolders: int,
                                         movedNotes: int }
POST   /api/profiles/{id}/duplicate  { }
                                     → 201 + Profile (new id, IsBuiltIn=false)
```

### 2.7 Added in Backend MR E (dictation reliability)

```
GET    /api/models/scan?dir=<path>   → [{ path, filename, size, kind: "whisper-ggml" | "vad-gguf" | "unknown" }]
```

### 2.8 Schema additions (EF migrations — authorship)

Migrations are additive and non-destructive. **One owner per migration** to avoid timestamp collisions:

| Migration                        | Adds                                                       | Owner           | Order |
|----------------------------------|------------------------------------------------------------|-----------------|-------|
| `0007_value_comparers.cs`        | no schema change, only `.Metadata.SetValueComparer()`      | Phase 1 Agent A | #1    |
| `0008_rag_embeddings.cs`         | `note_embeddings` table + columns                          | Backend MR C    | #2    |
| `0009_transcript_checkpoints.cs` | `transcript_segments.CheckpointAt DATETIME NULL`           | Backend MR B    | #3    |
| `0010_syncthing_settings.cs`     | extend `settings` with Syncthing API-key + port (nullable) | Backend MR D    | #4    |
| `0011_folder_mapping.cs`         | `folder_mappings` table + `vault_export_rules` table       | Backend MR B    | #5    |

Backend agent applies these in the order given. New migrations are added only after the previous succeeds locally.

### 2.9 Frontend constants alignment

`frontend/src/constants/api.ts` must list every endpoint above. Frontend agent updates this file once after Phase 1,
then pulls from the constants.

---

## 3. Red-first contract (every agent)

**Red-first** means: before any implementation agent writes impl code, the tests for that scope must compile (C# / TS
strict / Swift) or import (Python) and must fail for the *right* reason — missing symbol, missing endpoint route,
explicit assertion mismatch — not an environment error.

Acceptance by stack:

- **Backend unit** — missing method/class → compile error is OK for the red state; impl flips to green.
- **Backend integration** — missing endpoint → `HttpClient` returns 404 → assertion fails on body/status. Impl adds the
  route.
- **Frontend** — missing prop/action → TS type error at test-collect time counts as red.
- **Electron main** — mock `electron.Tray` / `electron.BrowserWindow` via `jest.mock`; assert on method calls; missing
  wiring → `expected .build to be called`.
- **Swift** — XCTest assertion fail (on user's Mac host, not in sandbox).
- **Python** — `TestClient.get(...)` → 404 / 500 → assertion fails; impl adds the route.

**Impl rule**: do **not** modify tests beyond trivial fixture cleanup (path renames, typed DI wiring). If an assertion
looks wrong, **stop and escalate** to the user — do not silently rewrite.

Commit-style discipline inside an agent's work (even without git): keep logical checkpoints — after red-first test for
BC-XXX, after green impl for BC-XXX. If `dotnet build` or `npm test` fails unexpectedly, revert the last logical step
and escalate.

---

## 4. Fixture strategy (single source)

| What                    | How                                                                                                                                                                            |
|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| SQLite per test         | existing `TestDatabase` helper (`backend/tests/Mozgoslav.Tests.Integration/TestDatabase.cs`); temp file per test; `Dispose` cleans `.db / .db-wal / .db-shm`.                  |
| `ApiFactory`            | existing (`backend/tests/Mozgoslav.Tests.Integration/ApiFactory.cs`). Use `ReplaceDbContextRegistration` pattern when replacing db.                                            |
| WireMock                | `WireMockServer.Start()` per test; close in `TestCleanup`. Mount the server as the `HttpClient.BaseAddress` for the service under test (register via `ConfigureTestServices`). |
| Testcontainers          | **only** BC-048/BC-049 Syncthing. Image: `syncthing/syncthing:latest`. Start in `TestInitialize`.                                                                              |
| Swift helper in tests   | electron-side tests use fake stdio stream with canned newline-JSON — no real spawn.                                                                                            |
| Filesystem temp         | `Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"))` per test; delete in cleanup.                                                                                  |
| Python `/embed` fixture | deterministic BoW fallback path always available in `test_embed.py` (no PyTorch dep). Real-model path guarded by `@pytest.mark.skipif(not _pytorch_available(), reason=...)`.  |

---

## 5. Quality bar and escalation

- **Every claim grounded.** Technical statements map to a file, symbol, tool output, or explicit "I do not know".
- **Reuse existing patterns.** `ChannelJobProgressNotifier` for SSE fan-out; `EfAppSettings` for settings reads/writes;
  `TestDatabase`/`ApiFactory` for integration tests; slice pattern for redux state. Reinventing requires a documented
  reason.
- **Consider failure modes.** Partial failure, service down, DB under load, slow consumer — risky changes name the
  explicit failure behavior.
- **2-strike rule.** Same step fails twice → **stop**, capture context, escalate. Do **not** try a blind third
  variation (different flag, different wording, different import path). Change strategy at the architecture level after
  2 failures.
- **No silent scope expansion.** Anything outside the agent's assigned scope (BCs + bugs listed in its per-agent spec)
  requires escalation. "While I'm at it…" is forbidden.
- **Tests are read-only during impl.** See §3 above.

---

## 6. Skills agents may invoke

- `superpowers:test-driven-development` — **mandatory** red-first discipline.
- `superpowers:verification-before-completion` — mandatory before finalising any agent run.
- `superpowers:systematic-debugging` — when hitting unexpected test failures (DI, lifetime, race).
- `superpowers:writing-plans` — Backend MR C (multi-file RAG) and Backend MR D (Syncthing lifecycle) may benefit.
- `superpowers:requesting-code-review` — before handing the run back to the orchestrator.
- `superpowers:frontend-design` — Frontend MR C (RagChat) + MR B (Get-Started animations) if available.
- `code-writing:integration-testing` — Backend integration tests across Testcontainers + WireMock.

---

## 7. Inter-agent dependencies (summary)

- **Backend MR C** produces embeddings via Python sidecar `/embed`. **Python agent** must complete `/embed` contract
  before Backend MR C integration tests pass. These two run in parallel, but Backend MR C's integration tests assume the
  Python contract is green.
- **Frontend MR C (RagChat)** calls `POST /api/rag/query`. Backend MR C exposes it. Frontend can red-first the call
  signature from §2.4 above without waiting.
- **Frontend MR D (Sync tab)** calls the §2.5 endpoints; Backend MR D provides them.
- **Swift agent** output (AX/CGEvent fallback) is compiled on user's Mac; electron-side wiring already expects the
  existing JSON-RPC shape, no new fields required.
- **Phase 1 Agent A** is blocking for every other agent (build must be green). Start Phase 2 only after Phase 1
  acceptance passes.
