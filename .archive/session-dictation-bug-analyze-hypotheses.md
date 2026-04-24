# Dictation Bug Analysis — 2026-04-23

## Symptom
Запись всегда возвращает одинаковый текст, не зависящий от того, что говорит пользователь. При push-to-talk вставляется один и тот же текст под курсор.

## Audio Flow (end-to-end)

### Path A: JSON Push (Electron DictationOrchestrator → Backend)
1. `NativeHelperClient` emits "audio" events with `AudioChunkPayload { samples: number[], sampleRate, offsetMs }`
2. `DictationOrchestrator.pushAudioToBackend(chunk)` POSTs to `/api/dictation/push/{sessionId}` with JSON body: `{ samples, sampleRate, offsetSeconds }` (lines ~55-57, 245-256 in DictationOrchestrator.ts)
3. Backend `DictationEndpoints.MapPost("/api/dictation/push/{sessionId:guid}")` reads `PushChunkRequest { Samples: float[], SampleRate, OffsetSeconds }`, converts to `AudioChunk(float[])` (lines 77-83 in DictationEndpoints.cs)
4. `DictationSessionManager.PushAudioAsync()` enqueues chunk into `AccumulatedChunks` and writes to per-session audio channel (PushAudioAsync)
5. `RunTranscriptionLoopAsync` reads from channel → `TeeAudioToBufferAsync` (writes crash-recovery buffer) → `_streaming.TranscribeStreamAsync(teedAudio, ...)` — this is WhisperNet streaming path

### Path B: Raw PCM/WebM Push (/api/dictation/{sessionId}/push)
1. Binary payload arrives with Content-Type `audio/pcm` or `application/octet-stream`
2. `DictationEndpoints.MapPost("/api/dictation/{sessionId:guid}/push")` branches on `LooksLikeRawPcm(payload)` (lines 94-128 in DictationEndpoints.cs)
3. If raw PCM: decodes via `BytesToFloat32Le(payload)` → `AudioChunk(float[])`
4. If WebM/Opus: forwards to ffmpeg decoder pipeline

## Where the bug could be

### Hypothesis 1: VAD filters out meaningful speech
- `SileroVadPreprocessor.ContainsSpeech(chunk)` uses RMS energy gating (threshold 0.005, min samples 160)
- If audio is corrupted or has wrong scale, RMS might consistently pass non-speech chunks AND fail on real speech
- **Check**: Log `[STREAM]` and `[CHUNK]` events — count `chunksPassedVad` vs total

### Hypothesis 2: Samples not normalized to [-1.0, 1.0]
- Comment in AudioChunk.cs says "Samples are 16-bit signed mono ... exposed as float array [-1.0, 1.0]"
- Electron side sends `number[]` without any normalization (DictationOrchestrator.ts pushAudioToBackend)
- If Swift native helper sends Int16 raw values (-32768 to 32767), Whisper receives massive amplitudes → VAD always passes → buffer grows with useless data

### Hypothesis 3: Same audio chunk sent repeatedly
- Check if NativeHelperClient is emitting the same audio event multiple times or not advancing its capture position
- Could happen if `AVAudioEngine` callback state gets stuck after permission check or device change

### Hypothesis 4: Whisper prompt biasing output
- DefaultPrompt in WhisperNetTranscriptionService.cs includes Russian conversational fillers ("Так, ведь, вот — именно")
- If audio is consistently silent/empty, Whisper falls back to prompt content → same text every time

## What was already fixed (commit 1f66bc9)

### BUG #1: Buffer accumulation ✅ FIXED
Before: `buffer.Clear()` was inside `if (!string.IsNullOrWhiteSpace(text))` — buffer grew indefinitely when Whisper returned empty.
After: `buffer.Clear()` is unconditional after emit window.

### BUG #2: Committed StringBuilder not updated in emit path ✅ FIXED
Before: Only commit-path (buffer cap) updated committed; emit path did not.
After: Both paths update `committed` consistently.

## What still needs investigation

1. **VAD logging** — Add `[VAD] Pass={Passes} rms={Rms}` to SileroVadPreprocessor.ContainsSpeech() 
2. **Sample range check** — Log the min/max of samples in first chunk per session
3. **SSE partials vs final text** — Compare what frontend receives during recording vs after /stop
4. **Audio buffer file** (crash-recovery) — If this exists, read it and verify it contains different audio at different timestamps

## Next actions

- [ ] Add VAD logging to SileroVadPreprocessor.ContainsSpeech()
- [ ] Add sample range logging in TranscribeStreamAsync first chunk
- [ ] Run dictation session with verbose logging → check logs for patterns
- [ ] Verify NativeHelperClient is not stuck emitting same audio event
- [ ] Test with synthetic audio (record known speech, feed to Whisper)
