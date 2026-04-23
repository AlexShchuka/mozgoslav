# Mozgoslav — Agent Guide

macOS desktop second-brain: Electron + React 19 + C# ASP.NET Minimal API (.NET 10) + SQLite + Python FastAPI sidecar (v0.8+ real ML).

## Quick Start Commands

| Task | Command |
|------|---------|
| Frontend dev server | `cd frontend && npm run dev` |
| Frontend build | `npm run build` (runs tsc typecheck first) |
| Frontend typecheck | `npm run typecheck` |
| Frontend tests | `npm test` (Jest + React Testing Library) |
| Backend tests | `cd backend && dotnet test -maxcpucount:1` |
| Backend build | `cd backend/src/Mozgoslav.Api && dotnet build` |

## Architecture Overview

```
Electron (main) ──▶ ASP.NET Minimal API (localhost:5050) ──▶ Whisper.net (CoreML on macOS)
     │                        │                                    │
     │  IPC / Net             │  HTTP                              │  In-process C#
     ▼                        ▼                                    ▼
  Native Helper          SQLite DB                         LLM polish (OpenAI/Ollama/Anthropic)
(Swift binary,            EF Core                           or skip if unavailable
 dictation + recording)   EnsureCreatedAsync
```

**Three layers:**
1. **Electron main** — native audio capture (Swift helper), UI window, IPC bridge
2. **Backend API** — session management, transcription orchestration, database persistence
3. **Python sidecar** — diarize/NER/gender/emotion services (optional, configured via `Mozgoslav:PythonSidecar:BaseUrl`)

## Key Entry Points

| Layer | File | Purpose |
|-------|------|---------|
| Electron main | `frontend/electron/main.ts` | App lifecycle, dictation orchestrator init, IPC handlers |
| Backend API | `backend/src/Mozgoslav.Api/Program.cs` | DI composition root, endpoint registration |
| Dictation flow | `frontend/electron/dictation/DictationOrchestrator.ts` | Push-to-talk session lifecycle driver |
| Transcription | `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs` | Whisper.net streaming + one-shot transcription |

## Critical Known Issues

**⚠️ Dictation repeats same text (P0 bug):**
- `WhisperNetTranscriptionService.cs:182` — buffer never cleared after emitting partials in streaming loop
- Every subsequent transcription contains ALL previous audio → repeated text
- See `docs/dictation-bug-analysis.md` for full investigation

## Dictation Flow Details

```
User presses hotkey
  ├─▶ Electron: handlePress() → /api/dictation/start (creates session)
  ├─▶ Swift helper: captureStart(48000 Hz)
  └─▶ Start SSE subscription to /api/dictation/stream/{sessionId}

Audio chunks arrive via NativeHelperClient "audio" events
  └─▶ DictationOrchestrator.pushAudioToBackend() → POST /api/dictation/push/{id}
      (JSON: {samples, sampleRate, offsetMs})

User releases hotkey
  ├─▶ Swift helper: captureStop()
  ├─▶ POST /api/dictation/stop/{sessionId}
  │   └─▶ Backend: TranscribeSamplesAsync(all accumulated samples) → LLM polish
  └─▶ Helper injectText(polishedText, mode) via CGEvent or Accessibility API
```

**Native helper binary location:** `helpers/MozgoslavDictationHelper/` (built with Swift Package Manager)

## Config & Environment

| Setting | Location | Default |
|---------|----------|---------|
| Database path | Env `Mozgoslav:DatabasePath` or app data dir | `~/Library/Application Support/mozgoslav/db.sqlite` |
| Backend port | Hardcoded in Electron | `5050` (`frontend/electron/main.ts:16`) |
| Whisper model | Settings UI → Models page | Must be downloaded first |
| Python sidecar | Env `Mozgoslav:PythonSidecar:BaseUrl` | Disabled if unset |

## Testing Conventions

- **Backend:** MSTest `[TestClass]` + FluentAssertions + NSubstitute
  - Unit tests in `backend/tests/Mozgoslav.Tests/`
  - Integration tests use real SQLite temp files via `TestDatabase` helper
- **Frontend:** Jest + React Testing Library + redux-saga-test-plan
  - Tests live next to source in `__tests__/` folders

## Build Artifacts & Generated Code

| Artifact | Location | Notes |
|----------|----------|-------|
| Electron compiled JS | `frontend/dist-electron/` | From vite-plugin-electron |
| Backend binaries | `backend/src/*/bin/Debug/net10.0/` | .NET 10 output |
| Whisper model cache | IMemoryCache (runtime) + disk download dir | Evicts after idle timeout |

## Style & Conventions (from CLAUDE.md)

- C#: One class per file, `sealed` on leaf classes, `internal` for cross-project visibility, no primary constructors
- Frontend: Feature-based structure (`Foo.tsx` + `.style.ts` + `.container.ts`), styled-components only, Redux+Saga slice pattern
- No comments in code (CLAUDE.md convention)
- Central package management via `Directory.Packages.props`

## Files to Read for Dictation Work

1. `frontend/electron/dictation/DictationOrchestrator.ts` — session lifecycle driver
2. `frontend/electron/dictation/NativeHelperClient.ts` — Swift helper IPC client
3. `backend/src/Mozgoslav.Api/Endpoints/DictationEndpoints.cs` — HTTP endpoints
4. `backend/src/Mozgoslav.Application/Services/DictationSessionManager.cs` — session manager
5. `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs` — transcription engine

## Related Files

- Root guides: `README.md`, `CONTRIBUTING.md`, `.archive/` (historical, ignore)
- Backend guide: `backend/CLAUDE.md`
- Frontend guide: `frontend/CLAUDE.md`
- Bug analysis: `docs/dictation-bug-analysis.md`
