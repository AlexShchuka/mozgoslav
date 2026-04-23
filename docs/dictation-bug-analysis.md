# Dictation Feature — Analysis Report & Bug Investigation

**Date:** 2026-04-23  
**Severity:** Critical (feature broken)  
**Symptom:** Text inserted is always the same, not reflecting actual speech

---

## Executive Summary

The dictation feature has a critical bug where identical text is injected regardless of what the user actually says. Investigation reveals **multiple architectural issues across all three layers**:

1. **Backend:** `WhisperNetTranscriptionService` does NOT clear buffer after emitting partials (line 182)
2. **Frontend:** Audio chunk format mismatch between Swift helper and backend expectations  
3. **VAD Pipeline:** Aggressive filtering can produce empty/silent chunks that Whisper hallucinates on

---

## Architecture Overview

```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│  Electron    │────▶│   Backend      │────▶│  Whisper.net │
│  (Swift      │ Audio│  (ASP.NET)    │Audio │  (CoreML)   │
│   Helper)    │JSON  │               │PCM   │              │
└──────────────┘     └───────────────┘     └──────────────┘
       │                    │                       │
       │ SSE                │ One-shot             │
       │ (partials)         │ (final text)          │
       ▼                    ▼                       ▼
   Overlay              Dictation               Polish/
   Window               Session                  Glossary
                        Manager
```

### Three-Layer Flow:

1. **Electron → Backend:** Audio chunks pushed via `/api/dictation/push/{sessionId}` (JSON format) or `/api/dictation/{id}/push` (raw PCM/WebM)
2. **Backend Internal:** `DictationSessionManager` accumulates chunks → streams to `WhisperNetTranscriptionService.TranscribeStreamAsync()` for partials
3. **On Stop:** All accumulated samples sent via `TranscribeSamplesAsync()` → LLM polish → text injection

---

## Critical Bugs Found

### BUG #1: Buffer Never Cleared After Partial Emit [CRITICAL]

**File:** `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs`  
**Lines:** 178-194

```csharp
if (samplesSinceLastEmit >= windowSamples)
{
    samplesSinceLastEmit = 0;
    var snapshot = buffer.ToArray();  // ← Snapshot taken
    var text = await TranscribeBufferAsync(whisperFactory, snapshot, ...);
    
    if (!string.IsNullOrWhiteSpace(text) || committed.Length > 0)
    {
        var emitted = committed.Length > 0
            ? $"{committed} {text}".Trim()
            : text;
        
        partialsEmitted++;
        yield return new PartialTranscript(Text: emitted, ...);
    }
    // ← BUG: buffer is NEVER cleared!
}
```

**Impact:** 
- Buffer grows indefinitely with ALL VAD-passed samples
- Every subsequent transcription contains ALL previous audio
- **This explains "same text repeated" — each new segment includes old speech**

### BUG #2: Committed StringBuilder Never Updated [HIGH]

**File:** Same as above, lines 164-175 (commit path) vs 183-194 (emit path)

```csharp
// Commit path (line 161-175) — DOES update committed:
if (buffer.Count > maxBufferSamples)
{
    var snapshot = buffer.ToArray();
    var committedText = await TranscribeBufferAsync(...);
    if (!string.IsNullOrWhiteSpace(committedText))
    {
        if (committed.Length > 0) committed.Append(' ');
        committed.Append(committedText.Trim());  // ← Updates!
    }
    buffer.Clear();  // ← Also clears!
}

// Emit path (line 178-194) — NEVER updates committed:
var text = await TranscribeBufferAsync(...);
// emitted uses stale "committed" but never appends new text to it
```

**Impact:** The `committed` StringBuilder only contains text from buffer-cap commits, not from windowed emits. This causes inconsistent partial accumulation.

### BUG #3: AudioChunk Type Mismatch [HIGH]

**File:** `frontend/electron/dictation/types.ts` line 16  
**vs:** `backend/src/Mozgoslav.Domain/ValueObjects/AudioChunk.cs` line 9

```typescript
// Frontend (Electron native dictation path):
interface AudioChunkPayload {
    readonly samples: readonly number[];  // ← Any number type
    readonly sampleRate: number;
    readonly offsetMs: number;
}
```

```csharp
// Backend expectation:
public sealed record AudioChunk(float[] Samples, int SampleRate, TimeSpan Offset);
// Comment says: "Samples are 16-bit signed mono... exposed as float array [-1.0, 1.0]"
```

**Problem:** The Electron `DictationOrchestrator.pushAudioToBackend()` (line 251-256) sends JSON with `samples` as a generic `number[]`. If the Swift helper sends Int16 values (e.g., `-32768` to `32767`) instead of normalized float values (`-1.0` to `1.0`), Whisper will receive:
- Massive amplitude values → VAD always passes chunks (RMS threshold 0.005 is tiny)
- Corrupted audio samples → Whisper hallucinates/repeats tokens

### BUG #4: VAD May Filter Everything [MEDIUM]

**File:** `backend/src/Mozgoslav.Infrastructure/Services/SileroVadPreprocessor.cs`  
**Lines:** 21-23, 36-39

```csharp
private const float RmsThreshold = 0.005f;  // Very low threshold
private const int MinSamples = 160;          // 10 ms at 16 kHz

public bool ContainsSpeech(AudioChunk chunk)
{
    if (chunk.Samples.Length < MinSamples)
    {
        return false;  // ← Small chunks rejected!
    }
    
    var rms = ComputeRms(chunk.Samples);
    var isSpeech = rms >= RmsThreshold;
    return isSpeech;
}
```

**Impact:** If audio samples are corrupted (see BUG #3), RMS could be:
- **Too high:** All chunks pass VAD → massive buffer accumulation
- **Zero/null:** No speech detected → empty transcription → Whisper returns filler words

---

## Secondary Issues

### ISSUE #5: SSE Partial Text Race Condition [LOW]

**File:** `frontend/electron/dictation/DictationOrchestrator.ts`  
**Lines:** 135, 176-178

```typescript
// handlePress() — resets partialText
this.partialText = "";

// handleRelease() — aborts SSE then clears
this.sseController?.abort();
this.sseController = null;
```

If SSE response handlers fire after abort (async timing), an old partial could overwrite fresh `partialText`. **Display only** — final text comes from `/api/dictation/stop`, not `partialText`.

### ISSUE #6: HotkeyMonitor State Corruption [LOW]

**File:** `frontend/electron/dictation/HotkeyMonitor.ts`  
**Lines:** 68-70, 73-77

```typescript
private handleMouseDown(event): void {
    if (this.mouseButton === null) return;
    if (event.button !== this.mouseButton || this.pressed) return; // Guard exists
    this.pressed = true;
    this.emit("hotkey", {type: "press", source: "mouse"});
}
```

If system receives mouse-up without corresponding down (e.g., window switch), `pressed` stays `true` forever → no future press events → orchestrator stuck in `recording` phase indefinitely.

### ISSUE #7: WhisperFactory Cache Refresh is Non-Atomic [LOW]

**File:** `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs`  
**Lines:** 181, 284

```csharp
// Only refreshes sliding expiration — doesn't verify factory is loaded
_ = _cache.TryGetValue(CacheKey, out _);
```

If model evicts between calls and next `TryGetValue` returns null, subsequent operations could fail silently.

---

## Debug Logging Recommendations

Add the following debug logs to aid future investigation:

### Backend (WhisperNetTranscriptionService):
```csharp
// Line 130 — in streaming loop, before VAD check
_logger.LogDebug("[STREAM] Chunk #{ChunksReceived}: {Length} samples, RMS={Rms:F4}", 
    chunksReceived, chunk.Samples.Length, rms);

// Line 157 — after buffer.AddRange
_logger.LogDebug("[STREAM] Buffer: {TotalSamples} total samples", buffer.Count);

// After emit (line ~193)
_logger.LogDebug("[EMIT] Cleared buffer. Previous size: {PrevSize}", snapshot.Length);

// TranscribeBufferAsync return value
_logger.LogDebug("[TRANSCRIBE] Input: {Length} samples → Output: \"{Text}\"", 
    samples.Length, result ?? "(empty)");
```

### Frontend (DictationOrchestrator):
```typescript
// pushAudioToBackend() — before sending
console.log('[dictation:push] Chunk:', chunk.samples.length, 'samples, RMS:', calculateRms(chunk.samples));

// parseSSEChunk() — after parsing partial
if (event === "partial" && data.length > 0) {
    console.log('[dictation:sse] Partial text updated to:', parsed.text);
}
```

---

## Recommended Fix Priority

| Priority | Bug | File | Effort |
|----------|-----|------|--------|
| P0 | Buffer not cleared after emit | `WhisperNetTranscriptionService.cs:182` | 5 min |
| P0 | Add buffer.Clear() in emit path | `WhisperNetTranscriptionService.cs:193` | 5 min |
| P1 | Audio sample normalization check | `NativeHelperClient.ts` + Swift helper | 30 min |
| P1 | Committed StringBuilder update | `WhisperNetTranscriptionService.cs:184-193` | 10 min |
| P2 | VAD threshold tuning | `SileroVadPreprocessor.cs:21` | 15 min |
| P2 | HotkeyMonitor state recovery | `HotkeyMonitor.ts` | 15 min |

---

## Architecture Recommendations

### Short-term (Fix):
1. Clear buffer after partial emit in streaming loop
2. Update committed StringBuilder consistently in both paths
3. Add sample validation (RMS range check) before sending to backend

### Medium-term (Improve):
1. **Add telemetry:** Track chunk counts, VAD pass rate, transcription duration per session
2. **Normalize audio samples** in Swift helper to guaranteed [-1.0, 1.0] float range
3. **Add idempotency guard** to prevent duplicate transcriptions

### Long-term (Redesign):
1. Consider streaming Whisper with proper beam search context window instead of sliding buffer
2. Add session-level deduplication for identical audio chunks
3. Implement fallback path if streaming fails (one-shot on every N seconds)

---

## Files That Need Modification

**Critical:**
- `backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs` — BUG #1, #2
- `frontend/electron/dictation/NativeHelperClient.ts` — Audio payload validation
- Swift helper binary (source not in repo) — Sample normalization

**Supporting:**
- `backend/src/Mozgoslav.Infrastructure/Services/SileroVadPreprocessor.cs` — VAD threshold tuning
- `frontend/electron/dictation/HotkeyMonitor.ts` — State recovery

---

## Verification Steps After Fix

1. Record 30 seconds of varied speech (not repetitive)
2. Verify partials update progressively during recording
3. Verify final text matches expected content, not previous session's text
4. Test rapid hotkey presses (stress test state management)
5. Monitor buffer growth in logs — should stay bounded by `StreamWindowMs`

---

## Visual Debug Aid

For quick debugging, add these console.log points:

```
[STREAM START] sessionId={sessionId} model={modelPath}
[CHUNK] idx={n} samples={len} rms={rms:.4f} vad_pass={passesVad}
[BUFFER] size={buffer.Count} maxCap={maxBufferSamples}
[EMIT] text="{text}" committedLen={committed.Length}
[TRANSCRIBE] input={samples.Length} samples → output="{text}" [{duration}ms]
[SSE EMIT] partialText="{partialText}"
[STOP] totalAccumulated={accumulatedLength} samples → final="{polishedText}"
```

These enable tracking whether audio is flowing correctly and transcription produces different results for different input.
