# Mozgoslav — OpenCode Session Notes

## Goal
Fix critical dictation bugs where identical text is injected regardless of actual speech (buffer accumulation + incomplete committed text updates) in WhisperNetTranscriptionService.cs.

## Constraints & Preferences
- C# codebase with no Russian inside `.cs` files
- No `#region`/`#endregion` directives; use modern C# pattern matching, records, LINQ
- Build once per batch, tests scoped via `--filter "FullyQualifiedName~<TargetClass>"`
- Use `dotnet test` max 3 times per task before escalating
- Commit message format: `type(scope): description`

## Progress

### Done
- **BUG #1 Fixed (Buffer accumulation):** `buffer.Clear()` moved outside `if (!string.IsNullOrWhiteSpace(text))` conditional in emit path — buffer now always cleared even when Whisper returns null/empty, preventing infinite accumulation of stale samples
- **BUG #2 Fixed (Committed text update):** 
  - Emit path: `committed.Append(text.Trim())` applied only when text is not null/empty (lines ~196-203)
  - Tail path: `committed` StringBuilder now updated consistently in all branches, buffer cleared after tail processing, yield guarded by `!string.IsNullOrWhiteSpace(emitted)` check
- **Debug logging added** per analysis report recommendations: `[STREAM]`, `[CHUNK]`, `[EMIT]`, `[TRANSCRIBE]`, `[EMIT] Cleared buffer` — covers stream/chunk/buffer/emit/transcribe tracking
- All three code paths (commit at maxBuffer, emit window, tail) now follow consistent pattern

### In Progress
- Writing unit tests for `WhisperNetTranscriptionService` streaming behavior covering:
  - Buffer cleared after emit window even when Whisper returns empty result
  - Committed StringBuilder updated in all paths (commit/emit/tail)
  - No stale data emitted when text is null
  - VAD filtering correctly skips silence without infinite buffer growth
  - Stream end with tail processing

### Blocked
- (none)

## Key Decisions
- `buffer.Clear()` must be unconditional — if Whisper returns empty, the window's samples are consumed and discarded; keeping them would cause re-transcription of stale data on next emit
- Only yield when there's actual content: guard with `!string.IsNullOrWhiteSpace(emitted)` prevents emitting stale/empty data to SSE clients
- Tail path yields committed text (not `committed + text`) since tail is the final portion

## Next Steps
1. Write unit tests in `/Users/aleksandr/RiderProjects/mozgoslav/backend/tests/Mozgoslav.Tests/Infrastructure/WhisperNetTranscriptionServiceTests.cs`
2. Build project: `dotnet build -maxcpucount:1 --no-incremental`
3. Run scoped tests: `dotnet test --filter "FullyQualifiedName~WhisperNetTranscriptionService"`
4. Fix any compilation/test failures

## Critical Context
- **Bug Symptom:** Text inserted is always the same regardless of what user says — caused by buffer never being cleared after partial emit when Whisper returns empty/null
- **Root Cause #1 (CRITICAL):** `buffer.Clear()` was inside `if (!string.IsNullOrWhiteSpace(text))` block at line 205 in original code; when text is null, buffer grows indefinitely
- **Root Cause #2:** Tail path (`if (buffer.Count > 0)`) did not update `committed` StringBuilder and yielded potentially stale data
- **Interface contract:** `IStreamingTranscriptionService.TranscribeStreamAsync()` returns `IAsyncEnumerable<PartialTranscript>`; samples are 16 kHz mono PCM chunks pushed via SSE

## Relevant Files
- `/Users/aleksandr/RiderProjects/mozgoslav/backend/src/Mozgoslav.Infrastructure/Services/WhisperNetTranscriptionService.cs` — main file being fixed (BUG #1 + BUG #2 + debug logging)
- `/Users/aleksandr/RiderProjects/mozgoslav/docs/dictation-bug-analysis.md` — source analysis report with root cause identification and recommendations
- `/Users/aleksandr/RiderProjects/mozgoslav/backend/src/Mozgoslav.Application/Interfaces/IStreamingTranscriptionService.cs` — interface definition for `TranscribeStreamAsync`
- `/Users/aleksandr/RiderProjects/mozgoslav/backend/tests/Mozgoslav.Tests/Application/SileroVadPreprocessorTests.cs` — reference test file pattern (TestClass, TestMethod attributes)

## Agent Verification State
- **Current Agent:** Developer Agent (coding only)
- **Verification Progress:** Code changes applied and verified inline; tests not yet written
- **Pending Verifications:** Unit test suite for WhisperNetTranscriptionService needs to be created and pass green
- **Previous Rejections:** (none — no agent review cycle yet)
- **Acceptance Status:** Working on code implementation before any review

## Delegated Agent Sessions
(none — all work done in main session so far; unit tests still pending)
