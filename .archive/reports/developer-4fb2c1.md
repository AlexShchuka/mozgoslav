# Developer agent run — Phase 2 Backend Cleanup

## Status

- Build: **PASS** — 7 projects, 0 errors, 0 warnings (Release, -maxcpucount:1).
- Tests: **PASS** — 140 unit + 117 integration = **257/257 green** (up from 245 baseline, +12 new tests, no
  regressions).

## Items closed

| # | Item                                                     | Status |
|---|----------------------------------------------------------|--------|
| 1 | Migration `0010_syncthing_settings` (BC-049)             | PASS   |
| 2 | `IIdleResourceCache<T>` interface extraction (BC-008)    | PASS   |
| 3 | Profile `TranscriptionPromptOverride` wiring (BC-030/N3) | PASS   |
| 4 | BC-009 crash-recovery PCM dump tests                     | PASS   |
| 5 | Opus-in-WebM decode in `/api/dictation/{id}/push`        | PASS   |

## Tests added

- `backend/tests/Mozgoslav.Tests.Integration/Syncthing/SyncthingSettingsPersistenceTests.cs` — 1 test
- `backend/tests/Mozgoslav.Tests/Infrastructure/IdleResourceCacheTests.cs` — 4 new tests (11 total in file)
- `backend/tests/Mozgoslav.Tests/Application/DictationSessionManagerTests.cs` — 4 new tests
- `backend/tests/Mozgoslav.Tests.Integration/DictationCrashRecoveryTests.cs` — 2 tests
- `backend/tests/Mozgoslav.Tests.Integration/DictationPushWebmOpusTests.cs` — 1 test

## Files touched

See `phase2-backend-cleanup-report.md` "Files touched — summary" section for the exhaustive list.

Key changes:

- New interfaces: `IIdleResourceCache<T>` (Application), `IAudioPcmDecoder` (Application).
- New impl: `FfmpegPcmDecoder` (Infrastructure) — pipes stdin → float32 LE stdout via ffmpeg.
- `WhisperNetTranscriptionService` rewired to depend on `IIdleResourceCache<WhisperFactory>` from DI.
- `DictationSessionManager.BuildInitialPrompt` now takes `(Profile?, IReadOnlyList<string>?)` and prefers profile
  override.
- `AppSettingsDto` + `IAppSettings` + `EfAppSettings` extended with `SyncthingApiKey` / `SyncthingBaseUrl`.
- New endpoint `POST /api/dictation/{sessionId:guid}/push` accepts octet-stream Opus-in-WebM / raw PCM.
- Fixture `backend/tests/Mozgoslav.Tests.Integration/_fixtures/dictation-sample.webm` (4.5 KB) committed so the decode
  integration test is reproducible without ffmpeg at test-time.

## Environment

- Installed `ffmpeg` (6.1.1) in the pod via `apt-get` to generate the test fixture. Runtime decode path (
  FfmpegPcmDecoder) will require ffmpeg on the user's machine — same policy as the existing FfmpegAudioConverter.

## Hand-off artefact

`/home/coder/workspace/mozgoslav-20260417/mozgoslav/phase2-backend-cleanup-report.md`
