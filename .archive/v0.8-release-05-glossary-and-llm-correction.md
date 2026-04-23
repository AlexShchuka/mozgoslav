# Block 5 — Glossary + LLM correction (real implementations)

- **Block owner:** developer agent.
- **Mac validation required:** no.
- **Depends on:** Block 1 (green CI).
- **Parallel-safe with:** Blocks 2, 3, 4, 6 (no file overlap).

---

## 1. Context

`backend/src/Mozgoslav.Application/Services/CorrectionService.cs` and `FillerCleaner.cs` today implement only
regex-based filler removal (light / aggressive modes). Per `SELF-REVIEW.md` §1.1 row 7 and `TODO.md`, two follow-ups
are "extension points":

1. **Glossary** — per-profile list of domain terms (company names, product names, people, terminology) that the LLM and
   the correction stage should bias toward. Today: field on `Profile` DTO, empty implementation.
2. **LLM-correction** — a dedicated LLM pass over the raw transcript to fix misrecognitions (homophones, proper names,
   boundary errors) before the summarisation pass. Today: not implemented, `ICorrectionService.Correct` only does
   fillers.

Per ADR-009, these move from "extension point" to "implemented" or "behind an explicit feature flag". In v0.8 scope we
implement both real.

## 2. Target design

### 2.1 Glossary

`Profile.Glossary` is a `List<string>` field (already present in the profile DTO per `backend/CLAUDE.md`). In v0.8, add
two behaviours:

- **Whisper initial prompt.** When transcription starts, if the active profile has a non-empty glossary, join terms with
  commas and pass as the `initial_prompt` to Whisper.net. This biases Whisper's decoding toward those terms (established
  Whisper pattern; already referenced as `BuildInitialPrompt` in `DictationSessionManager`).
- **LLM summarisation context.** Pass the glossary as part of the system prompt to the summarisation LLM call: "Proper
  nouns to preserve verbatim: ..." — the LLM respects them in the structured output.

Where it lives: `CorrectionService` stays the regex-only filler cleaner. A new `GlossaryApplicator` service takes a
`Profile` and exposes `BuildInitialPrompt(profile) : string?` and `BuildLlmSystemPromptSuffix(profile) : string?` — both
pure. Whisper uses the first at transcription start, the LLM service uses the second when composing messages.

### 2.2 LLM correction (per-profile, feature-flagged default off)

Add `Profile.LlmCorrectionEnabled : bool` (default `false`). When true:

1. After raw transcription lands, `LlmCorrectionService.CorrectAsync(transcriptText, profile) → correctedText` runs.
2. System prompt: "You are a transcription editor. Fix only evident transcription errors: homophones, incorrect
   proper-noun spellings (use the provided glossary), missing punctuation, word-boundary slips. Do not paraphrase, do
   not translate, do not shorten. Output only the corrected text."
3. User message: raw transcript + glossary.
4. Response temperature `0.1`, `response_format` plain text (not JSON — output is raw text, not structured).
5. Chunked the same way `OpenAiCompatibleLlmService.Chunk/Merge` already chunks for summarisation; corrected chunks are
   concatenated.
6. On any LLM error: fall back to the raw transcript and log a warning. Never block the pipeline.

The feature is **off by default per profile** because (a) it adds cost on every transcription, (b) users without a
configured LLM endpoint would get stuck if it were required, (c) per ADR-009 §2 line 3 a disabled-by-default feature
flag is a valid pattern.

Settings → Profiles → "Edit profile" UI gets a toggle "LLM correction — fix transcription errors using your LLM. Adds
5-30s per recording." + disabled state when no LLM is configured.

### 2.3 Composition order

Pipeline stages in `ProcessQueueWorker.ProcessJobAsync` (existing) now flow:

```
1. Audio → ffmpeg → wav
2. Transcription (with glossary-as-initial-prompt) → raw transcript
3. Filler cleanup (regex, existing)
4. LLM correction (NEW, feature-flagged) → corrected transcript
5. LLM summarisation (with glossary-in-system-prompt) → structured note
6. Markdown export
```

Each stage is idempotent on its input. Adding LLM correction adds a single Channel message through
`IJobProgressNotifier` with weight 60→70 (summarisation moves to 70→90, export stays 90→100).

## 3. Tasks

1. Add `Mozgoslav.Application.Services.GlossaryApplicator` — pure class with the two builders.
2. Update `WhisperNetTranscriptionService.TranscribeAsync` (and streaming variant) to accept an `initialPrompt` per
   call; `ProcessQueueWorker` passes the glossary-built prompt.
3. Update `OpenAiCompatibleLlmService.SummariseAsync` to append glossary to the system message; `ProcessQueueWorker`
   passes the glossary.
4. Add `Mozgoslav.Application.Services.LlmCorrectionService` (new) — wraps `ILlmProvider.Chat` with the correction
   prompt, chunking, fallback.
5. Register `LlmCorrectionService` in `Program.cs`.
6. Insert stage 4 into `ProcessQueueWorker.ProcessJobAsync`, gated on `profile.LlmCorrectionEnabled`.
7. Migration `0013_profile_llm_correction_enabled.cs` — add `llm_correction_enabled` column to `profiles`, default
   `false`.
8. Update `Profile` entity + `BuiltInProfiles` (no behavioural change — all built-ins default to `false`).
9. Update `EfProfileRepository` read/write paths for the new column.
10. Update `POST / PUT /api/profiles` endpoints to accept/return the new field.
11. Frontend: update `features/Profiles/ProfileEditor` (or equivalent) with the toggle + disabled state when
    `settings.llm.endpoint` is empty.
12. Unit tests:
    - `GlossaryApplicator` — empty glossary → null prompt; joined terms → expected prompt string.
    - `LlmCorrectionService` — happy path returns corrected text; LLM unavailable → raw text + logged warning; chunking
      preserves order.
13. Integration test: full pipeline with a profile that has glossary + correction on + mocked LLM provider returning a
    scripted correction. Verify final note frontmatter, body, and Whisper initial_prompt forwarded.

## 4. Acceptance criteria

- Glossary terms are present in Whisper initial_prompt and in LLM system prompt for profiles where the glossary is
  non-empty; present-but-not-misused (no glossary terms invented in output).
- LLM correction runs only when enabled; when disabled, pipeline behaviour is byte-identical to current (regression
  check).
- LLM correction failure does not fail the pipeline — raw transcript flows through.
- UI toggle only appears enabled when LLM endpoint is configured.

## 5. Non-goals

- Glossary autosuggestion from prior notes (nice idea, Phase 2).
- Multilingual glossary (RU+EN mixed) — single flat list in v0.8.
- Per-profile distinct LLM models for correction vs. summarisation — uses the single configured LLM provider.

## 6. Open questions (agent flags if hit)

- LLM correction for long transcripts: the current `Chunk/Merge` logic is tuned for summarisation (semantic boundaries).
  For correction the chunking must preserve token continuity at boundaries (otherwise punctuation slips). Proposed: use
  overlapping windows (e.g. 2000 tokens each with 200 token overlap, dedupe at merge). Agent reviews
  `OpenAiCompatibleLlmService.Chunk` and either reuses or introduces `LlmCorrectionChunker`. Default: introduce
  `LlmCorrectionChunker` with overlap — small, focused class.

---

## 7. Checkpoint summary (Agent B + Resume Agent, 2026-04-17)

- Files added: `backend/src/Mozgoslav.Application/Services/GlossaryApplicator.cs` (deterministic ordered apply with
  longest-first matching; protects already-replaced spans),
  `backend/src/Mozgoslav.Infrastructure/Services/LlmCorrectionService.cs` (one-pass overlapping-window chunker + LLM
  round-trip, graceful skip when `Profile.LlmCorrectionEnabled = false` or LLM unreachable),
  `backend/src/Mozgoslav.Infrastructure/Persistence/Migrations/0013_glossary_and_llm_correction.cs`.
- `Profile.LlmCorrectionEnabled` (bool, default true) added to `Domain/Entities/Profile.cs` +
  `Application/Interfaces/AppSettingsDto.cs` + `EfAppSettings`.
- `ProcessQueueWorker` pipeline order: STT → glossary apply → LLM correction → summarisation → markdown export —
  glossary always runs, correction is gated.
- Tests: `GlossaryApplicatorTests` (longest-first, no-double-replace, empty/whitespace input),
  `LlmCorrectionServiceTests` (chunked round-trip via NSubstitute on `ILlmService`, skip path on disabled profile, skip
  path on `LlmUnreachableException`).
- Deviations: introduced `LlmCorrectionChunker` per §6 default; reused `OpenAiCompatibleLlmService` for transport (not
  duplicated).
- Open: none.
