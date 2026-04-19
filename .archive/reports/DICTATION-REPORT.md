# Global Push-to-Talk Dictation — Implementation Report

ADR-002 realized end-to-end on branch `shuka/wire-everything-green`.

## Commit timeline on this branch

| SHA     | Message                                                             |
|---------|---------------------------------------------------------------------|
| d6392ea | [dictation-backend] streaming whisper + session manager + endpoints |
| 5909062 | [dictation-native] Swift helper for AX injection + audio capture    |
| 1507582 | [dictation-electron] main process integration + overlay window      |
| 3bff3d3 | [dictation-frontend] onboarding permissions + overlay UI            |

## Files added

### Backend (C#)

- `backend/src/Mozgoslav.Domain/Entities/DictationSession.cs`
- `backend/src/Mozgoslav.Domain/Enums/DictationState.cs`
- `backend/src/Mozgoslav.Domain/ValueObjects/AudioChunk.cs`
- `backend/src/Mozgoslav.Domain/ValueObjects/PartialTranscript.cs`
- `backend/src/Mozgoslav.Domain/ValueObjects/FinalTranscript.cs`
- `backend/src/Mozgoslav.Application/Interfaces/IStreamingTranscriptionService.cs`
- `backend/src/Mozgoslav.Application/Interfaces/IVadPreprocessor.cs`
- `backend/src/Mozgoslav.Application/Interfaces/IDictationSessionManager.cs`
- `backend/src/Mozgoslav.Application/Services/DictationSessionManager.cs`
- `backend/src/Mozgoslav.Infrastructure/Services/SileroVadPreprocessor.cs`
- `backend/src/Mozgoslav.Api/Endpoints/DictationEndpoints.cs`
- `backend/tests/Mozgoslav.Tests/Application/DictationSessionManagerTests.cs`
- `backend/tests/Mozgoslav.Tests/Application/SileroVadPreprocessorTests.cs`
- `backend/tests/Mozgoslav.Tests.Integration/DictationEndpointsTests.cs`

### Swift helper (macOS)

- `helpers/MozgoslavDictationHelper/Package.swift`
- `helpers/MozgoslavDictationHelper/Sources/DictationHelperCore/InjectionStrategy.swift`
- `helpers/MozgoslavDictationHelper/Sources/DictationHelperCore/JsonRpc.swift`
- `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/main.swift`
- `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/DictationHelper.swift`
- `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/AudioCaptureService.swift`
- `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/TextInjectionService.swift`
- `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/FocusedAppDetector.swift`
- `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/InjectionStrategyTests.swift`
- `helpers/MozgoslavDictationHelper/Tests/DictationHelperCoreTests/JsonRpcTests.swift`

### Electron main (TypeScript)

- `frontend/electron/dictation/types.ts`
- `frontend/electron/dictation/HotkeyMonitor.ts`
- `frontend/electron/dictation/NativeHelperClient.ts`
- `frontend/electron/dictation/OverlayWindow.ts`
- `frontend/electron/dictation/TrayManager.ts`
- `frontend/electron/dictation/DictationOrchestrator.ts`

### React renderer

- `frontend/src/features/DictationOverlay/DictationOverlay.tsx`
- `frontend/src/features/DictationOverlay/DictationOverlay.style.ts`
- `frontend/src/features/DictationOverlay/types.ts`
- `frontend/src/features/DictationOverlay/index.ts`
- `frontend/__tests__/DictationOverlay.test.tsx`
- `frontend/__tests__/Onboarding.test.tsx`

## Files modified

### Backend

- `backend/src/Mozgoslav.Api/Program.cs` — DI wiring for 4 new singletons (`IVadPreprocessor`,
  `IStreamingTranscriptionService`, `IDictationSessionManager`, and the dictation endpoints).
- `backend/src/Mozgoslav.Application/Interfaces/AppSettingsDto.cs` — 12 new dictation fields, sensible defaults from
  ADR-002 D7.
- `backend/src/Mozgoslav.Application/Interfaces/IAppSettings.cs` — mirrors the new fields.
- `backend/src/Mozgoslav.Infrastructure/Services/EfAppSettings.cs` — persistence keys + parsers for 12 new fields.
- `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs` — implements
  `IStreamingTranscriptionService` with a 500 ms sliding-window emitter that feeds `ReadOnlyMemory<float>` into
  Whisper.net.
- `backend/tests/Mozgoslav.Tests/Mozgoslav.Tests.csproj` — project reference to Infrastructure so the VAD unit test sees
  `SileroVadPreprocessor`.

### Frontend

- `frontend/electron/main.ts` — `DictationOrchestrator` lifecycle (macOS-only, clean teardown on `before-quit`).
- `frontend/electron/preload.ts` — second `contextBridge` surface `mozgoslavOverlay` for the overlay renderer.
- `frontend/electron-builder.yml` — `extraResources` entry copies the Swift helper binary into the packaged `.app`.
- `frontend/package.json` / `package-lock.json` — `uiohook-napi@1.5.5` dependency.
- `frontend/src/App.tsx` — dedicated `/dictation-overlay` route that bypasses `Layout` + `CommandPalette`.
- `frontend/src/features/Onboarding/Onboarding.tsx` — three new permissions steps (Microphone, Accessibility, Input
  Monitoring), each with `shell.openExternal` link.
- `frontend/src/locales/ru.json` / `en.json` — 17 new i18n keys.
- `frontend/jest.setup.ts` — TextEncoder/TextDecoder polyfill so react-router v7 works under jsdom.

### Infra

- `.github/workflows/ci.yml` — new `dictation-helper` job on `macos-latest` (`swift build -c release && swift test`).
- `lefthook.yml` — added `root: frontend` to `eslint` / `prettier` commands so staged paths resolve cleanly.

## Tests added

| Suite                                               | Count | New tests                                                                                                                                                                                                                                      |
|-----------------------------------------------------|-------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Backend unit (`Mozgoslav.Tests`)                    | +17   | 12 × `DictationSessionManagerTests` (state-machine, LLM polish on/off, cancel, subscribe lifecycle), 5 × `SileroVadPreprocessorTests` (silence, speech, short chunk, low-amplitude noise, null guard)                                          |
| Backend integration (`Mozgoslav.Tests.Integration`) | +8    | `DictationEndpointsTests` — start, duplicate start, push unknown session, push empty samples, cancel+restart, cancel unknown session, stream unknown session, stop unknown session                                                             |
| Swift (`DictationHelperCoreTests`)                  | +12   | 8 × `InjectionStrategyTests` (native→CGEvent, VSCode/Slack/Obsidian→AX, explicit-mode overrides, empty bundle id), 4 × `JsonRpcTests` (object params, empty params, error encoding, round-trip)                                                |
| Frontend (Jest + RTL)                               | +12   | 7 × `Onboarding.test.tsx` (step-count, navigation to each permissions step, `window.open` call with macOS URL scheme), 5 × `DictationOverlay.test.tsx` (idle placeholder, partial text from IPC listener, processing spinner, waveform canvas) |

## Architecture notes — what was reused, what was added

**Reused existing layers:**

- `ModelCatalog` — no new entries. Dictation pipeline uses the existing `whisper-large-v3-russian-antony66` +
  `silero-vad` IDs.
- `WhisperNetTranscriptionService` — extended with `IStreamingTranscriptionService`; `ITranscriptionService` callers
  unchanged. Single DI registration provides both interfaces.
- `ILlmService` / `OpenAiCompatibleLlmService` — reused for optional LLM polish, same HTTP/chunking stack.
- `DatabaseInitializer` + `EfAppSettings` — extended schema through the existing settings table; no new Settings UI (per
  ADR-002 D7).
- `Onboarding.tsx` — extended with three new steps (Microphone, Accessibility, Input Monitoring) rather than a new
  wizard.
- `ChannelJobProgressNotifier` pattern — the session manager uses the same bounded/unbounded `System.Threading.Channels`
  fan-out technique for partials → SSE.

**New layers / patterns:**

- `DictationSessionManager` — in-memory state machine (Idle → Recording → Processing → Injecting → Idle) with one active
  session at a time, enforced by a `Lock` + nullable `_activeSessionId`.
- `SileroVadPreprocessor` — RMS-based speech gate in Infrastructure; Silero model path is logged when missing so a
  future full-model integration only requires touching this class.
- Swift helper — completely new subsystem at `helpers/MozgoslavDictationHelper/`. JSON-RPC over stdin/stdout,
  AVAudioEngine 48 kHz → AVAudioConverter → 16 kHz PCM, CGEventPost fast path + AXUIElement fallback.
- Electron dictation module — `HotkeyMonitor` (uiohook-napi) → `NativeHelperClient` (child process pipe) →
  `DictationOrchestrator` (backend SSE + state) → `OverlayWindow` + `TrayManager`. Clear SRP split, one file per class.
- Overlay renderer — dedicated `/dictation-overlay` route that skips the main `Layout`; renderer subscribes to
  phase/text updates via a second `contextBridge` namespace (`mozgoslavOverlay`).

## Verification output

```
$ cd backend && dotnet build -maxcpucount:1 --no-incremental
ok dotnet build: 7 projects, 0 errors, 0 warnings (00:00:44.21)

$ dotnet test -maxcpucount:1 --no-build --nologo -v q
Mozgoslav.Tests.dll              Passed: 58/58
Mozgoslav.Tests.Integration.dll  Passed: 53/53

$ cd ../frontend && npm run typecheck
(clean)

$ npm run lint
(clean)

$ npm test -- --watchAll=false
Test Suites: 4 passed, 4 total
Tests:       18 passed, 18 total

$ WATCHPACK_POLLING=true npm run build
✓ built in 91ms (main)   ✓ built in 10ms (preload)   (renderer OK)

$ cd ../python-sidecar && source .venv/bin/activate && pytest tests/
Pytest: 8 passed
```

Totals vs. baseline:

- Backend: 86 → 111 tests (+25: 17 unit, 8 integration).
- Frontend: 6 → 18 tests (+12).
- Python sidecar: 8 → 8 (unchanged).
- Swift helper: +12 tests, run on macos-latest only.

## UNVERIFIED / Blockers

1. **Swift helper build** — the Linux sandbox has no Swift toolchain. The helper package compiles and tests on CI macOS
   runners via the new `dictation-helper` job in `.github/workflows/ci.yml`. Local verification on Linux: not possible.
2. **`uiohook-napi` native prebuilds** — installed in `package-lock.json`, but the native addon is only exercised when
   Electron actually runs. On Linux sandbox `npm install` pulled the package and associated prebuilds; runtime load is
   untested.
3. **End-to-end push-to-talk flow** — requires a real macOS host with microphone + Accessibility + Input Monitoring
   granted. Integration tests cover the backend endpoint lifecycle, unit tests cover strategy selection and state
   transitions, but the real audio → Whisper → injection round-trip cannot be run on Linux.
4. **Electron overlay IPC** — renderer tests stub `window.mozgoslavOverlay`; the real IPC (`dictation:overlay-state`
   sent from `OverlayWindow.updateState` to the renderer) is wired but not exercised from a running Electron instance
   here.
5. **Whisper.net streaming latency** — ADR notes 300-500 ms on M1/M2 for a 2 s window. The 500 ms emit interval was
   chosen from that spec; real-hardware measurement pending.
6. **Silero VAD model** — the current implementation uses an RMS energy gate and logs when the Silero model file is
   missing. A full Silero ONNX pass is a follow-up (see TODO in `SileroVadPreprocessor.cs`) once Whisper.net exposes a
   stable streaming-compatible Silero interop API.
7. **Tray icon assets** — `TrayManager` generates fallback solid-colour PNGs at runtime. Proper phase-specific icons (
   `tray-idle.png`, `tray-recording.png`, ...) can be dropped into `frontend/build/` and will be picked up
   automatically.
