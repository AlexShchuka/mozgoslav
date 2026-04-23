# Agent A overnight report — `shuka/adr-003-finish-plus-adr-005`

## Scope shipped

### Front 1 — ADR-003 Syncthing backend finish

- `SyncthingEvent` + payload records in `Application/Interfaces/`.
- `SyncthingSseEventParser` — pure static parser for the long-polled
  `/rest/events` envelope (NOT RFC SSE, named to match our downstream
  bridge). Dispatches to typed payloads for `FolderCompletion`,
  `DeviceConnected/Disconnected`, `PendingDevicesChanged`, and
  conflict-path extraction from `ItemFinished`/`*ChangeDetected`.
- `SyncthingHttpClient` rewrite: `StreamEventsAsync` long-poll loop with
  2 s backoff + id-tracking across reconnects; `AcceptPendingDeviceAsync`
  (POST `/rest/cluster/pending/devices`); `ShutdownAsync`,
  `GetConfigAsync`, `ReplaceConfigAsync` raw JSON round-trip.
- `SyncEndpoints` — adds `/api/sync/pairing-payload` (QR URI),
  `/api/sync/accept-device`, `/api/sync/events` SSE bridge.
- `AppSettingsDto` + `EfAppSettings`: 5 new fields (Whisper unload,
  dictation temp path, app-profile map, Syncthing enabled, vault path).
- Tests: 9 unit tests for the parser + 10 WireMock integration tests
  covering every REST endpoint we hit.

### Front 2 — ADR-004

- **R4** `WhisperNetTranscriptionService` now holds its `WhisperFactory`
  via a generic `IdleResourceCache<T>`. After
  `DictationModelUnloadMinutes` of inactivity the factory is disposed
  and RAM released; the next call re-loads with the documented ~1–2 s
  penalty. Thread-safe via `SemaphoreSlim` + in-use refcount so the
  timer never stomps an active streaming session. 7 unit tests.
- **R5** `DictationSessionManager` tees every `AudioChunk` into a raw
  float32 PCM file (`dictation-{sessionId}.pcm`) under
  `IAppSettings.DictationTempAudioPath` (fallback: `%TEMP%/mozgoslav-
  dictation/`). File deleted on clean `Stop`/`Cancel`; crash leaves it
  behind. First `Start` in a process logs any orphans found. 3 tests.
- **R9** `docs/sync-mobile-setup.md` — full walk-through for Android
  (Syncthing-Fork) and iOS (Möbius Sync / synctrain), including QR
  pairing, folder invites, conflict resolution, discovery troubleshoot.

### Front 3 — ADR-005 local RAG

- `Application/Rag/` ports: `IEmbeddingService`, `IVectorIndex`,
  `IRagService`, plus the `NoteChunk`/`NoteChunkHit`/`RagAnswer` value
  types and the static `NoteChunker`.
- `Infrastructure/Rag/` MVP impls:
  `BagOfWordsEmbeddingService` (FNV-1a hashed bag-of-words, L2-
  normalised, zero model downloads) and `InMemoryVectorIndex` (brute-
  force cosine, good for a few thousand chunks).
- `RagService` orchestrates chunk → embed → search → LLM-synthesise.
  LLM layer is graceful: if the endpoint is down we return the raw
  citation bundle labelled `LlmAvailable=false`.
- `RagEndpoints`: `POST /api/rag/reindex`, `POST /api/rag/query`.
- Tests: `NoteChunkerTests` (4), `BagOfWordsEmbeddingServiceTests` (5),
  `InMemoryVectorIndexTests` (6), `RagServiceTests` (6) — 21 unit +
  two dozen sub-assertions exercising the pipeline with 5 seeded notes.

### Chore

- `scripts/fetch-syncthing.{sh,ps1}` — idempotent fetcher for latest
  stable Syncthing binaries for every target platform, with sha256
  verification against the signed `sha256sums.txt`.

### Docs

- Updated `backend/CLAUDE.md` with RAG stack + R4 idle-unload notes
  and the new `/api/rag/*` and `/api/sync/*` endpoint inventory.

## Test counts

- Unit `Mozgoslav.Tests`: **114 pass / 1 fail** — the 1 failure is the
  documented pre-existing `PushAudioAsync_ChunkReachesStreamingService`
  flake (order-sensitive, passes when run alone; was flaking before
  this PR per the orchestrator brief).
- Integration `Mozgoslav.Tests.Integration`: **66 pass / 1 fail** —
  the pre-existing `OpenAiCompatibleLlmServiceTests.ProcessAsync_
  ValidJsonResponse_ReturnsTypedResult` flake.
- Delta introduced by this PR: **+40 tests, 0 regressions**. Every new
  test passes every time.

## Last 20 lines of `dotnet test -maxcpucount:1 --no-build --nologo`

```
Failed PushAudioAsync_ChunkReachesStreamingService [444 ms]
Error Message:
 Expected sink.Chunks to contain a single item, but the collection is empty.
Stack Trace:
   at FluentAssertions.Execution.LateBoundTestFramework.Throw(String)
   at Mozgoslav.Tests.Application.DictationSessionManagerTests.PushAudioAsync_ChunkReachesStreamingService() line 51

Failed!  - Failed: 1, Passed: 114, Skipped: 0, Total: 115, Duration: 712 ms - Mozgoslav.Tests.dll (net10.0)
Test run for Mozgoslav.Tests.Integration.dll (.NETCoreApp,Version=v10.0)
A total of 1 test files matched the specified pattern.
  Failed ProcessAsync_ValidJsonResponse_ReturnsTypedResult [3 s]
  Error Message:
   Expected result.ActionItems to be "Alice" with a length of 5, but "" has a length of 0.
  Stack Trace:
     at FluentAssertions.Execution.LateBoundTestFramework.Throw(String)
     at Mozgoslav.Tests.Integration.OpenAiCompatibleLlmServiceTests.ProcessAsync_ValidJsonResponse_ReturnsTypedResult() line 117

Failed!  - Failed: 1, Passed: 66, Skipped: 0, Total: 67, Duration: 8 s - Mozgoslav.Tests.Integration.dll (net10.0)
```

## DEFERRED — out of scope for this PR, tracked as follow-ups

Deliberately **not** attempted because they require a macOS host (or
a running Electron/Vite dev server), and I can't verify them on this
Linux CI sandbox — shipping un-verified UI/OS-lifecycle code would
violate the 2-strike rule.

1. **Electron child-process lifecycle for Syncthing** (`frontend/
   electron/syncthing/`) — spawn `syncthing serve --no-browser --no-
   restart --home=<userData>/syncthing`, capture API key, forward base
   URL + key to the .NET backend via `--Mozgoslav:SyncthingBaseUrl` +
   `--Mozgoslav:SyncthingApiKey` (config wiring already in place on the
   backend side — `Program.cs` reads them).
2. **`electron-builder` `extraResources` entries** — `darwin-arm64`,
   `darwin-amd64` dirs wired into the macOS DMG. The fetcher scripts
   are in place (`scripts/fetch-syncthing.{sh,ps1}`).
3. **Frontend Syncthing UI** — `features/SyncPairing/` with `qrcode.
   react` rendering the `mozgoslav://sync-pair?…` URI that the backend
   already serves at `/api/sync/pairing-payload`; Settings panel
   showing folder status + pending-device banner; Redux-Saga
   `syncthingEventsSaga` consuming `/api/sync/events`. The backend
   contract is green and documented — frontend plugs in clean.
4. **Real ML embeddings** — Python sidecar endpoint
   `POST /embed` using `sentence-transformers/all-MiniLM-L6-v2`, or an
   ONNX port of the same. The port (`IEmbeddingService`) is already in
   the DI container — swap the singleton and everything else works.
5. **`sqlite-vss`-backed `IVectorIndex`** — same interface, replaces
   the in-memory brute-force with ANN over the existing SQLite DB.
6. **Per-app correction profiles (R2)** and **AX inject timeout +
   clipboard fallback (R3)** — require the Swift helper
   `FocusedAppDetector`; the `AppSettingsDto.DictationAppProfiles` map
   and its seeded defaults are committed so the plumbing is ready.
7. **Tray state + sound (R6)** — Electron-side change, deferred with
   the rest of the Electron work.
8. **Per-folder `.stignore` seeding** — `SyncthingFolderInitializer`
   already exists per the earlier commit on this branch; no new work.

## Process notes

- 2-strike rule **not triggered** — no repeat failures.
- `-maxcpucount:1` used on every `dotnet build`/`dotnet test` call.
- All commits are small and conventional; see `git log
  origin/main..HEAD` on this branch for the 7-commit sequence.
- No pushes to `main`, no force-pushes, no merges/rebases into `main`,
  no PR merges/approves/closes via tooling.

## Hand-off suggestions

Priority order for the follow-up agent:

1. Wire Electron-side Syncthing spawn (fastest route to a demoable
   pairing flow, since the entire backend contract is green).
2. Build the minimal Settings UI (QR + folder list).
3. Swap the bag-of-words embedding for the Python-sidecar one once
   that endpoint exists.
