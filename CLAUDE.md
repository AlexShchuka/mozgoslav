# Mozgoslav — project guide for AI

> `.archive/` and `.archive/session-notes-*/` are historical. **Do not read them as source of truth.**

macOS-first desktop second-brain: Electron + React 19 UI ↔ ASP.NET Minimal API backend ↔ Python FastAPI ML sidecar.

## Layout

```
mozgoslav/
├── backend/           C# 14 / .NET 10 ASP.NET Minimal API, EF Core SQLite, Serilog, OpenTelemetry metrics
├── frontend/          Electron + React 19 + TS strict + Redux-Saga + styled-components + i18next
├── python-sidecar/    FastAPI app — diarize / NER (real), gender / emotion (stubs until model fetched)
├── helpers/           Swift native helper (audio capture + text injection) — built with Swift Package Manager
├── docs/              README + adr/ (ADR-014 living backlog; shipped ADRs in .archive/adrs/)
├── .archive/          historical / superseded — ignore as source of truth
├── README.md          user-facing install + first run on macOS
└── CONTRIBUTING.md    developer setup (Rider, tests, lefthook, conventions)
```

## Dev commands

| Task | Command |
|------|---------|
| Frontend dev server | `cd frontend && npm run dev` |
| Frontend build | `cd frontend && npm run build` (runs tsc typecheck first) |
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
  Native Helper          SQLite DB                              LLM polish (OpenAI/Ollama/Anthropic)
(Swift binary,            EF Core                              or skip if unreachable
 dictation + recording)   EnsureCreatedAsync                   Python sidecar (diarize/NER/etc.)
```

### Backend clean-architecture split

```
backend/src/
├── Mozgoslav.Domain/         entities, value objects, enums — zero external deps
├── Mozgoslav.Application/    use cases + port interfaces (I*Repository, ITranscriptionService, ILlmService, IMarkdownExporter, IAppSettings, IJobProgressNotifier), MarkdownGenerator, CorrectionService, Rag/
├── Mozgoslav.Infrastructure/ EF Core DbContext + Ef* repositories, Whisper.net / OpenAI / ffmpeg / Obsidian / Meetily / ModelDownload services, Serilog, MozgoslavMetrics
└── Mozgoslav.Api/            Program.cs (DI composition root), Endpoints/*, QueueBackgroundService (hosted), OpenTelemetry
```

### Frontend structure

```
frontend/
├── electron/
│   ├── main.ts         hardened window (contextIsolation, sandbox, CSP), IPC handlers, dictation orchestrator
│   ├── preload.ts      contextBridge whitelist → window.mozgoslav
│   └── dictation/      DictationOrchestrator, NativeHelperClient, HotkeyMonitor
├── src/
│   ├── api/            BaseApi + ApiFactory + per-domain *Api.ts (Notes, Recording, Dictation, Settings, …)
│   ├── store/          Redux + Saga slices (recording slice is canonical reference)
│   ├── features/       Dashboard, Queue, Notes, Profiles, Models, Settings, Logs, Backups, RecordingList
│   ├── components/     shared primitives: Button, Input, ProgressBar, GroupedList, Card, Badge, Layout
│   ├── styles/         theme.ts, ThemeProvider, GlobalStyle
│   └── domain/         TS types mirroring the C# domain (single source)
└── vite.config.ts + electron-builder.yml
```

## Key architectural decisions

1. **Native Whisper.net (no subprocess)** — `WhisperNetTranscriptionService`. macOS uses CoreML (`.mlmodelc` next to ggml model). Linux/Windows: CPU fallback, clear error if model path missing.
2. **OpenAI SDK against OpenAI-compatible endpoints** (LM Studio / Ollama). `response_format=json_schema`. Chunks >24k chars split/merged via `OpenAiCompatibleLlmService.Chunk/Merge`.
3. **EF Core + SQLite** via `MozgoslavDbContext`. `OnModelCreating` + value converters. `EnsureCreatedAsync` on startup (NOT a migration tool — delete `mozgoslav.db` on dev boxes after schema changes).
4. **`Channel<T>` fan-out** for job progress (`ChannelJobProgressNotifier`). SSE at `GET /api/jobs/stream`. Non-blocking.
5. **Graceful degradation** — LLM unreachable → skip summary, keep raw transcript. Export fails → note saved, retryable via `POST /api/notes/{id}/export`.
6. **Idempotent imports** — `sha256` unique index on `recordings`. Re-import returns original Recording.
7. **Background queue** — `QueueBackgroundService` with 2 s idle delay; `ProcessQueueWorker.ProcessNextAsync` catches exceptions and marks `Failed`, never stalls the queue.
8. **ADR-005 RAG** — `Application/Rag/` owns the pipeline. MVP: `BagOfWordsEmbeddingService` + `InMemoryVectorIndex`; drop-in replacements planned via sentence-transformers / `sqlite-vss`.
9. **ADR-004 R4 idle-unload** — `WhisperFactory` cached in `IMemoryCache` with sliding expiration = `DictationModelUnloadMinutes`. Post-eviction callback disposes the factory. Reload adds ~1-2 s first-call latency.

## Backend conventions

- One class per file. No `#region`. No primary constructors — traditional ctors with explicit `readonly` fields.
- `sealed` on leaf classes. `internal` where cross-project visibility is not needed.
- Central package management (`Directory.Packages.props`, floating majors). Central build props (`Directory.Build.props`): `TargetFramework=net10.0`, `LangVersion=14`, `Nullable=enable`, `TreatWarningsAsErrors=true`.
- **NO COMMENTS** in `.cs` files (team rule). XML `///` summaries are allowed on public API surface only.
- Tests: MSTest (`[TestClass]` / `[TestMethod]`) + FluentAssertions + NSubstitute. Integration tests spin real SQLite temp files via `TestDatabase`. Unit tests in `backend/tests/Mozgoslav.Tests/`, integration in `backend/tests/Mozgoslav.Tests.Integration/`.

## Frontend conventions

- **Container + Presentational** — `Foo.tsx` (pure, receives props) + `Foo.container.ts` (`connect(mapStateToProps, mapDispatchToProps)`).
- **Store slice pattern** — `actions.ts` + `reducer.ts` + `mutations.ts` + `selectors.ts` + `saga/*.ts`. `slices/recording` is the canonical reference.
- **Styling** — styled-components only. Zero inline CSS, no Tailwind, no CSS modules. Theme tokens in `src/styles/theme.ts`.
- **i18n** — every user-facing string via `useTranslation`. Add keys to both `ru.json` and `en.json`.
- **Exports** — default for components, named for utilities / selectors / types.
- **Sensitive inputs** (tokens, API keys) — `<Input sensitive />`. Never log.
- **Feature structure** — `Foo.tsx` + `.style.ts` + `.container.ts` + `types.ts`. Shared primitives live in `src/components/`.
- Tests: Jest + React Testing Library + `redux-saga-test-plan`. `__tests__/` folders sit next to code they cover.

## Electron bridge

`window.mozgoslav` exposes (preload.ts + main.ts ipcMain.handle):

- `openAudioFiles()` — native multi-file picker
- `openFolder()` — folder picker (Obsidian vault)
- `openPath(path)` — reveal in Finder

Add bridge methods in both `preload.ts` (contextBridge) and `main.ts` (ipcMain.handle).

## Dictation flow (push-to-talk)

```
User presses hotkey
  ├─▶ Electron: handlePress() → /api/dictation/start (creates session)
  ├─▶ Swift helper: captureStart(48000 Hz → resample to 16 kHz)
  └─▶ Start SSE subscription to /api/dictation/stream/{sessionId}

Audio chunks arrive via NativeHelperClient "audio" events
  └─▶ DictationOrchestrator.pushAudioToBackend() → POST /api/dictation/push/{id}
      (JSON: {samples, sampleRate, offsetMs}; samples MUST be normalized to [-1, 1])

User releases hotkey
  ├─▶ Swift helper: captureStop()
  ├─▶ POST /api/dictation/stop/{sessionId}
  │   └─▶ Backend: TranscribeSamplesAsync(all accumulated samples) → LLM polish
  └─▶ Helper injectText(polishedText, mode) via CGEvent or Accessibility API
```

Native helper binary location: `helpers/MozgoslavDictationHelper/` (Swift Package Manager).

## Backend API endpoints

```
/api/health           /api/health/llm
/api/recordings       /api/recordings/{id}     /api/recordings/import   /api/recordings/upload   /api/recordings/{id}/reprocess   /api/recordings/{id}/notes
/api/jobs             /api/jobs/active         /api/jobs/stream         POST /api/jobs
/api/notes            /api/notes/{id}          POST /api/notes/{id}/export
/api/profiles         /api/profiles/{id}
/api/settings
/api/models           POST /api/models/download
/api/meetily/import
/api/obsidian/setup
/api/logs             /api/logs/tail
/api/backup           POST /api/backup/create
/api/rag/reindex      POST /api/rag/query
/api/sync/status      /api/sync/health         /api/sync/pairing-payload   POST /api/sync/accept-device   /api/sync/events
/api/dictation/start  /api/dictation/stop/{id} /api/dictation/push/{id}    /api/dictation/stream/{id}
```

## Python sidecar

Real endpoints: `GET /health`, `POST /api/cleanup` (regex filler removal), `POST /api/embed` (sentence-transformers on macOS, SHA-256 bag-of-words on dev; both 384-dim L2-normalised).
Stubs (contract-correct dummy payloads until real models on macOS): `/api/diarize`, `/api/gender`, `/api/emotion`, `/api/ner`.
Extending a stub: add pkg to `requirements.txt` → implement service → wire router → add pytest with small fixture.

## Extension points

- **New backend service** — implement interface in `Application/Interfaces/`, register in `Api/Program.cs`.
- **New backend endpoint** — add `Api/Endpoints/Foo.cs` with `public static IEndpointRouteBuilder MapFooEndpoints(this IEndpointRouteBuilder endpoints)`, call `.MapFooEndpoints()` in `Program.cs`.
- **New backend schema** — update `Domain/Entities` + `MozgoslavDbContext.OnModelCreating`. On dev boxes delete local `mozgoslav.db` (EnsureCreated is not a migration tool).
- **New frontend feature** — use plop generators (`npm run plop`) for features and store slices.

## Config & environment

| Setting | Location | Default |
|---------|----------|---------|
| Database path | Env `Mozgoslav:DatabasePath` or app data dir | `~/Library/Application Support/mozgoslav/db.sqlite` |
| Backend port | Hardcoded in Electron `frontend/electron/main.ts` | `5050` |
| Whisper model | Settings UI → Models page | Must be downloaded first |
| Python sidecar | Env `Mozgoslav:PythonSidecar:BaseUrl` | Disabled if unset |

## Files to read for dictation work

1. `frontend/electron/dictation/DictationOrchestrator.ts` — session lifecycle driver
2. `frontend/electron/dictation/NativeHelperClient.ts` — Swift helper IPC client
3. `backend/src/Mozgoslav.Api/Endpoints/DictationEndpoints.cs` — HTTP endpoints
4. `backend/src/Mozgoslav.Application/Services/DictationSessionManager.cs` — session manager
5. `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs` — transcription engine (one-shot + streaming)

## Planned feature — OpenCode integration (ADR-020 … ADR-023)

Proposed, not yet implemented. Everything here is forward-declared so agents
working on the feature land in consistent places.

- **ADR-020** — architecture + UX shape. Two sidebar entries: "OpenCode"
  (full-window `xterm.js`) and "OpenCode Settings". Renderer ↔ Electron main
  ↔ backend split.
- **ADR-021** — binary provisioning. On-demand download from
  Mozgoslav-owned GitHub release, sha256-pinned, installed under
  `~/Library/Application Support/mozgoslav/opencode/bin/`. Reuses
  `ModelDownloadService` primitives.
- **ADR-022** — PTY ownership. `node-pty` in Electron main, byte pipe to
  `xterm.js` via the `contextBridge`. Backend does not handle raw bytes.
- **ADR-023** — settings surface. Domain records persisted into the
  existing SQLite `settings` table (no new tables); secrets referenced by
  `*Ref` keys and resolved only at config-file render time; managed
  `opencode.json` + `mcp.json` written atomically to
  `~/Library/Application Support/mozgoslav/opencode/config/` with mode `0600`.

Planned endpoints (under `Api/Endpoints/OpencodeEndpoints.cs`, registered in
`Program.cs` via `MapOpencodeEndpoints()`):

```
/api/opencode/status     /api/opencode/runtime    /api/opencode/settings
/api/opencode/events     POST /api/opencode/install   POST /api/opencode/update
POST /_internal/opencode/lifecycle   (Electron → backend)
```

Planned module layout:

```
frontend/electron/opencode/        OpencodeProcess.ts, runtimeClient.ts, types.ts
frontend/src/features/OpenCode/    OpenCode.tsx + OpenCodeSettings.tsx (container/presentational)
frontend/src/api/OpencodeApi.ts
frontend/src/store/slices/opencode/ actions/reducer/mutations/selectors/saga (recording slice is reference)
backend/src/Mozgoslav.Infrastructure/Services/
    OpencodeInstaller.cs
    OpencodeRuntimeService.cs
    OpencodeSettingsService.cs
    OpencodeConfigRenderer.cs
backend/src/Mozgoslav.Infrastructure/Resources/OpencodeCatalog.json
```

Privacy rules stay identical to the dictation / Obsidian features: no
telemetry, CSP unchanged, secrets in SQLite behind `<Input sensitive />`,
OpenCode's outbound network traffic is user-configured only.

Deferred scope: multi-session tabs, server/attach mode, MCP discovery UI,
system-opencode override, per-project settings, Keychain-backed secrets,
native React chat UI. All tracked under `ADR-014 → OpenCode` (items O1…O7).
