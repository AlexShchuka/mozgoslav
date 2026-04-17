# Block 3 — Mac native audio recorder + global hotkey verification

- **Block owner:** developer agent (writes code) + shuka (runs on Mac, reports back).
- **Mac validation required:** **yes** — agent cannot run AVFoundation/AppKit in Linux sandbox.
- **Depends on:** Block 1 (green CI baseline).
- **Unblocks:** Block 4 (Onboarding mic/accessibility/input-monitoring steps rely on a real recorder).

---

## 1. Context

`backend/src/Mozgoslav.Infrastructure/Services/NoopAudioRecorder.cs` ships today as the `IAudioRecorder` registration. On any platform it throws `PlatformNotSupportedException` the moment `StartAsync` is called. Per ADR-009 §2.1, line 1, we replace it with:

- A real macOS implementation — `AVFoundationAudioRecorder` — talking to the existing `helpers/MozgoslavDictationHelper` Swift package over JSON-RPC (stdin/stdout) for low-latency PCM capture.
- On non-macOS, a `PlatformUnsupportedAudioRecorder` that declares `IsSupported=false` and throws on `Start`. UI hides the record button when unsupported.

The Swift helper already exists with `AudioCaptureService` and `InjectionStrategy` (for dictation — keystroke inject via AX). Block 3 extends it for pure recording and wires both the recording path and the dictation hotkey round-trip.

## 2. Architecture

### 2.1 Component diagram

```
Electron main
   │
   ├── spawns helper: helpers/MozgoslavDictationHelper (long-running child)
   │      JSON-RPC over stdin/stdout
   │      ├── capture.start { sampleRate, channels }
   │      ├── capture.stop → { path, durationMs }
   │      ├── hotkey.register { accelerator }
   │      ├── hotkey.unregister
   │      ├── inject.text { text, bundleId? }
   │      └── event: { type: "hotkey", accelerator }
   │
   └── backend (.NET) ← IPC via localhost HTTP (existing backend)
          IAudioRecorder → AVFoundationAudioRecorder
             uses the same helper instance by talking to Electron, which
             proxies recording RPCs. (See §2.3 for the transport choice.)
```

### 2.2 `IAudioRecorder` contract

Already defined in `Mozgoslav.Application.Interfaces.IAudioRecorder`. Stable across platforms:

```csharp
public interface IAudioRecorder
{
    bool IsSupported { get; }
    bool IsRecording { get; }
    TimeSpan CurrentDuration { get; }
    Task StartAsync(string outputPath, CancellationToken ct);
    Task<string> StopAsync(CancellationToken ct);
}
```

Two implementations after Block 3:

- `AVFoundationAudioRecorder` — macOS-only. Talks to the helper. `IsSupported = OperatingSystem.IsMacOS()` && helper reachable.
- `PlatformUnsupportedAudioRecorder` — default when `!IsSupported`. `StartAsync` throws `PlatformNotSupportedException` with a clear message.

### 2.3 Transport between backend and helper

**Option A — Backend talks to Electron, Electron talks to helper.** Backend POSTs `/app/record/start` to Electron (new endpoint via IPC); Electron invokes helper via existing JSON-RPC. This is the current shape for dictation.

**Option B — Backend spawns its own helper instance (separate from Electron's).** Cleaner separation but doubles the helper lifetime problem (two instances, two hotkey registrations, two AX permission prompts).

**Decision: Option A.** Electron is the macOS host; it owns the helper lifecycle. Backend talks to it over HTTP on a loopback endpoint provided by Electron. Dictation already uses this path; recording reuses it.

Electron exposes (via existing `preload.ts`):

```typescript
interface MozgoslavBridge {
  startRecording: (outputPath: string) => Promise<{ sessionId: string }>;
  stopRecording: (sessionId: string) => Promise<{ path: string; durationMs: number }>;
  cancelRecording: (sessionId: string) => Promise<void>;
}
```

Backend calls these via a narrow HTTP bridge (`electron/main.ts` registers `ipcMain.handle('record:start', …)` and exposes the result via an internal `http://127.0.0.1:<port>/_internal/record/*` endpoint that the backend consumes). Port is passed to backend via env at spawn.

### 2.4 Swift helper changes

Existing: `AudioCaptureService.swift` captures audio for dictation (AVAudioEngine). Extend it:

- New JSON-RPC method `capture.startFile` with params `{ outputPath, sampleRate, channels, format }` — captures to a file directly (recording mode), vs. the current streaming-to-stdin (dictation mode).
- New JSON-RPC method `capture.stopFile` with params `{ sessionId }` returning `{ path, durationMs, success }`.
- Permission probes: `permission.check` returning `{ microphone: true|false|undetermined, accessibility: …, inputMonitoring: … }` so the Onboarding block (Block 4) can auto-advance without user guessing.

## 3. Tasks

### 3.1 Backend (agent, sandbox)

1. Add `backend/src/Mozgoslav.Infrastructure/Services/AVFoundationAudioRecorder.cs` implementing `IAudioRecorder` against the Electron bridge endpoint.
2. Add `backend/src/Mozgoslav.Infrastructure/Services/PlatformUnsupportedAudioRecorder.cs` with `IsSupported=false`.
3. Replace `NoopAudioRecorder` registration in `Program.cs` with:
   ```csharp
   if (OperatingSystem.IsMacOS())
       builder.Services.AddSingleton<IAudioRecorder, AVFoundationAudioRecorder>();
   else
       builder.Services.AddSingleton<IAudioRecorder, PlatformUnsupportedAudioRecorder>();
   ```
4. Delete `NoopAudioRecorder.cs`.
5. Add integration tests for `PlatformUnsupportedAudioRecorder` (easy) and for `AVFoundationAudioRecorder` against a fake Electron bridge using WireMock.
6. Update `GET /api/audio/capabilities` (new) to return `{ isSupported, detectedPlatform, permissionsRequired }` for the Onboarding block.

### 3.2 Electron (agent, sandbox)

1. Extend `frontend/electron/dictation/NativeHelperClient.ts` with `startFileCapture` and `stopFileCapture` methods.
2. Add internal loopback HTTP endpoint `/_internal/record/{start,stop,cancel}` on a random port, communicated to backend via env var `MOZGOSLAV_ELECTRON_INTERNAL_PORT` at backend spawn time (in `backendLauncher.ts`).
3. Register `ipcMain.handle('record:*', …)` for renderer use (Dashboard's "Record" button) — renderer path is optional in v0.8; backend-driven recording is the primary path.
4. Update `preload.ts` bridge to expose `startRecording / stopRecording` to renderer.
5. Jest unit tests for the new IPC handlers.

### 3.3 Swift helper (agent writes code; shuka builds on Mac)

1. Extend `helpers/MozgoslavDictationHelper/Sources/MozgoslavDictationHelper/AudioCaptureService.swift` with the file-capture mode.
2. Extend `helpers/MozgoslavDictationHelper/Sources/DictationHelperCore/JsonRpc.swift` with new method names.
3. Swift unit tests for the JsonRpc dispatch (AVAudioEngine parts stay untested in CI per `ci.yml` comment — tested only on Mac).

### 3.4 UI alignment (agent, sandbox)

1. In `frontend/src/features/Dashboard/Dashboard.tsx`, replace the current "Record (not yet implemented)" disabled state with:
   - If `/api/audio/capabilities` returns `isSupported=true`: render active Record button.
   - Otherwise: render the Upload/Import panel only, with a tiny footnote "Recording is a macOS-only feature today."
2. Record button triggers backend `POST /api/recordings/start` (new) which calls `IAudioRecorder.StartAsync`. Stop triggers `POST /api/recordings/stop/{id}`.
3. Existing drag-drop import flow is untouched.

### 3.5 Global hotkey verification (agent codes; shuka validates)

Existing: `electron/dictation/globalHotkey.ts` + `preload.ts` + `Dashboard.tsx` fire the dictation pipeline on Cmd+Shift+Space. TODO-1 marks this as "partial — macOS-native round-trip not verified".

1. Agent: ensure the accelerator registration logic is correct (it already registers `CommandOrControl+Shift+Space`). Add a diagnostic log at register/unregister time, visible in `Logs` UI.
2. Shuka on Mac:
   - Grant Accessibility + Input Monitoring permissions via Onboarding flow (Block 4).
   - Press Cmd+Shift+Space. Observe log lines in Logs page: "global-hotkey:register ok", "global-hotkey:triggered", "dictation:start:global-hotkey".
   - Record a short phrase. Release (another Cmd+Shift+Space). Observe transcript appears in Dashboard.
   - If the round-trip fails: file the failure in `block3-mac-validation-YYYY-MM-DD.md` with precise step-by-step. Agent diagnoses and re-attempts.
   - If the round-trip cannot be made green in one Mac pass, per ADR-009 §2.1 row 6, fall back to flag-off: set `Mozgoslav:FeatureFlags:GlobalDictationHotkey=false` in `appsettings.json`, hide the Settings toggle, add banner in the Logs UI explaining the temporary gate. Moves to Phase 2.

## 4. Acceptance criteria

- `NoopAudioRecorder` is deleted from the codebase.
- On macOS: record button works end-to-end (press → record → stop → playback/import in Dashboard), file lands in the expected location, metadata persisted.
- On Linux/Windows: record button is hidden, `GET /api/audio/capabilities` returns `isSupported=false`, no crash if backend `IAudioRecorder.StartAsync` is called (throws typed exception, logged).
- Global hotkey either green end-to-end on shuka's Mac **or** honestly feature-flagged off with UI banner.
- All three integration test suites (backend, frontend, swift helper) pass — helper on macOS runner only.

## 5. Non-goals

- Hot-plug detection (USB mic inserted/removed) — later iteration.
- Audio level meters in the UI — exists in dictation overlay, not needed for pure recording path.
- Multiple simultaneous recordings — single session sufficient.
- Recording from system audio (loopback) — macOS requires BlackHole/ScreenCaptureKit; out of v0.8.

## 6. Open questions (agent flags if hit)

- Which format for the output file? Default: WAV 16 kHz mono (matches Whisper input). Alternative: m4a (smaller) + ffmpeg convert before transcription (extra step). Decision: WAV — we already run ffmpeg downstream, no need to convert twice.
- Does AVAudioEngine deliver 16 kHz directly or should we resample in Swift? AVAudioEngine natively delivers the hardware rate (typically 48 kHz); add a resampler node inside the helper. Confirmed on Mac at shuka's validation.

## 7. Mac validation checklist (required)

After agent pushes this block, shuka:

1. `git pull`, `cd helpers/MozgoslavDictationHelper && swift build -c release` — must succeed.
2. `swift test` — must pass.
3. `cd ../.. && npm --prefix frontend run dev` (backend + frontend + helper all up).
4. On first run, Onboarding (Block 4 will handle this properly; for now: manual grant) — grant Microphone, Accessibility, Input Monitoring permissions.
5. Click Record on Dashboard. Speak 10 seconds. Stop. File appears in Queue, transitions to transcribed Note.
6. Press Cmd+Shift+Space. Speak 5 seconds. Press Cmd+Shift+Space again. Confirm transcript appears.
7. Report `block3-mac-validation-2026-04-YY.md`:
   - `[✓/✗] swift build`
   - `[✓/✗] swift test`
   - `[✓/✗] Mac app launches, backend and helper both reachable`
   - `[✓/✗] Record → transcribed note`
   - `[✓/✗] Global hotkey round-trip`
   - Any log snippets for failures.

---

## 8. Checkpoint summary (Agent B, 2026-04-17)

- Backend: `AVFoundationAudioRecorder` (talks to Electron via `MOZGOSLAV_ELECTRON_INTERNAL_PORT` loopback HTTP), `PlatformUnsupportedAudioRecorder` (non-macOS gate), `NoopAudioRecorder` deleted, `Program.cs` platform-aware registration, `GET /api/audio/capabilities`, `POST /api/recordings/start`, `POST /api/recordings/stop/{sessionId}`.
- Electron: `RecordingBridge` (internal HTTP on random port, proxies to Swift helper), `NativeHelperClient.startFileCapture` / `stopFileCapture` / `checkPermissions`, `preload.ts` `startNativeRecording` / `stopNativeRecording`, `main.ts` wiring, `backendLauncher.ts` `extraEnv` option.
- Swift helper: `AudioCaptureService` file-capture mode (AVAudioEngine + resampler + `AVAudioFile` per session), `DictationHelper.swift` three new methods (`capture.startFile`, `capture.stopFile`, `permission.check`), `PermissionProbe.swift`.
- Tests: `PlatformUnsupportedAudioRecorderTests` (3 methods, 100% platform-gated contract), `AVFoundationAudioRecorderTests` (WireMock bridge, 3 methods), `RecordingBridge.test.ts` (4 Jest methods).
- Global hotkey verification: diagnostic log line at register/unregister already present in `globalHotkey.ts`; full round-trip verification falls to shuka on Mac (§3.5).
- Dashboard UI: existing BC-004 Record button already wired through `/api/dictation/*`; left intact. The new backend-driven `/api/recordings/start` endpoint is available for future UX flows but the Dashboard keeps its existing path for v0.8.
- Open: shuka runs Mac validation per §7; if hotkey round-trip fails the `Mozgoslav:FeatureFlags:GlobalDictationHotkey=false` fallback from §3.5 is the escape hatch.

