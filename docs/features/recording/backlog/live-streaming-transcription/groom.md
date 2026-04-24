---
backlog: recording/live-streaming-transcription
status: Grooming (primary analysis)
date: 2026-04-24
authors: [shuka]
machine_readable: true
---

# Grooming — live streaming transcription

Primary analysis of the one-liner backlog item
`docs/features/recording/backlog/live-streaming-transcription.md` ("Today file-only
pipeline. Streaming mode is a large architectural rework; value versus episodic
recording is unclear.").

## 1. Problem restated

Recording mode today is fully post-hoc:

1. User presses Record. Backend spawns the native macOS capture helper via the
   Electron bridge; helper writes a WAV file under `AppPaths.Recordings`.
2. User presses Stop. `POST /api/recordings/stop` ends the helper, registers a
   `Recording` row, enqueues a processing job.
3. Quartz fires `ProcessRecordingQuartzJob` → `ProcessQueueWorker.RunPipelineAsync`
   → `ITranscriptionService.TranscribeAsync(path, …)` → segments → note export.

Want: while the recording is still active, the UI shows the running transcript
text, updating every ~300 ms, so long-form sessions stop feeling like a black
box and the user can verify speech is captured without stopping to check.

## 2. Reality check — the streaming infra already exists

The one-liner framing ("streaming mode is a large architectural rework") is no
longer accurate. Two pieces are already in production:

- `WhisperNetTranscriptionService.TranscribeStreamAsync` — sliding-window
  streaming transcription with VAD, 300 ms emission cadence, 15 s max buffer,
  stream-specific `BeamSize=1` (faster, lower accuracy than the `BeamSize=5`
  file path). Returns `IAsyncEnumerable<PartialTranscript>`.
- `DictationSessionManager` — wires `IDictationPcmStream` (ffmpeg-backed WebM
  → PCM decoder, `Channel<float[]>` fan-out) into the streaming service and
  emits partials over the existing SSE infrastructure.

Push-to-talk dictation has therefore already walked every architectural rock:
browser audio capture, WebM chunking, backend PCM decode, streaming Whisper,
SSE partials. The remaining question is *reuse vs. re-introduce* at the
long-form recording path.

## 3. Gap

Three concrete gaps vs. dictation:

- **Capture source.** Dictation captures from `MediaRecorder` inside the
  renderer and POSTs chunks to `DictationEndpoints`. Recording captures inside
  the Swift helper (`AVFoundationAudioRecorder` → localhost bridge → native
  process) and never surfaces the PCM to the backend until Stop returns the
  full WAV.
- **Transcription path.** Only `ProcessQueueWorker` (file-only) is wired on
  the recording pipeline. `IStreamingTranscriptionService` is registered in DI
  but only consumed by dictation.
- **UI.** `HomeList` / `Dashboard` show "recording …" + duration. There is no
  live-partials component; SSE `job-progress` already exists but is bound to
  job phase/percent, not partial text.

## 4. Design surface (open forks)

### 4.1. Where do the PCM chunks come from?

- **A. Tap the Swift helper.** Swift emits PCM frames over a localhost socket
  or HTTP chunked response in parallel with writing the WAV. Single source of
  truth; audio goes to disk and to the streamer from the same AVAudioEngine
  tap. Adds a new native-bridge contract and a Swift helper release.
- **B. Parallel MediaRecorder in the renderer.** Frontend spins up a second
  `MediaStreamTrack` on the same device, sends WebM chunks to the streaming
  endpoint just like dictation does today. Zero Swift changes, but the mic is
  opened twice (macOS lets you, latency overhead is measurable), and the
  stream sees a slightly different signal than the file (different resample /
  AGC timing).
- **C. File tail reader.** Stream reads appended bytes from the in-flight WAV
  with `FileStream.Read` + poll. Simplest, but WAV header is only finalised on
  Stop and tail latency is bounded by the OS flush cadence (≥0.5–1 s), which
  kills the 300 ms emission target.

### 4.2. Who runs the streaming pipeline?

- **A. Reuse `DictationSessionManager` with a new "long-form" session kind.**
  Same WebM-ingest / PCM-decode / Whisper-stream / SSE-partials path, different
  termination (on Stop: do NOT auto-inject text at cursor; instead persist as a
  Transcript row when the recording's job completes). Extends an existing
  service.
- **B. New `RecordingStreamManager`.** Sibling service with separate session
  lifecycle, separate SSE channel. More services, cleaner boundaries, more
  dup.

### 4.3. Finalisation on Stop — trust the stream or re-run the file?

- **A. Trust the stream.** Persist the accumulated `PartialTranscript` list
  as the recording's final transcript. Fast (already done), but `BeamSize=1`
  accuracy is visibly worse than `BeamSize=5`.
- **B. Keep the stream for UX, re-run the file for persistence.** Stream drives
  the live view and is discarded on Stop; `ProcessQueueWorker` does its normal
  file-based transcription for the canonical Transcript. Double compute, but
  strictly no quality regression.
- **C. Hybrid with reconciliation.** Use streaming partials as the baseline,
  reconcile timestamps with the re-run, keep the higher-quality version. Most
  engineering, best UX. Probably overkill for a local-first app.

### 4.4. Fan-out to the UI

- `Channel<T>` + SSE is the house pattern (ADR-002, ADR-018). Add a
  `recording-partials` SSE event stream keyed by `sessionId`; the `HomeList`
  card subscribes while its session is active.
- `IJobProgressNotifier` is the wrong abstraction — that is for terminal job
  status, not mid-recording partials. New `IRecordingPartialsNotifier` with a
  separate `Channel<RecordingPartialPayload>`.

### 4.5. VAD / silence handling

`TranscribeStreamAsync` already calls `IVadPreprocessor.ContainsSpeech` per
chunk and drops silence before the sliding-window buffer. Nothing to add at
the Whisper path — the knob is whether the UI should visually distinguish "no
speech yet" from "transcribing" (e.g. a pulse on the record card). Minor UX
polish, not architectural.

## 5. Value question (from the backlog one-liner)

The one-liner flagged value as unclear. Concrete wins:

- **Confidence.** Long-form users cannot tell whether the mic is actually
  capturing until they hit Stop and wait for the full pipeline. Live text ends
  that category of surprise.
- **Editable-as-you-go.** Downstream, the partials could feed a live-notes
  view where the user pins / reacts to utterances during the session. Not in
  this groom's scope; a hook for future work.
- **Debugging.** Mic-dead cases surface in < 5 s instead of after a 10-minute
  session.

Costs to weigh against it:

- One more SSE channel.
- CPU: streaming Whisper runs continuously for the whole session length. On an
  M1 with a small model the continuous cost is tolerable (same as dictation,
  just longer); with a large model it is not.
- If Stop re-runs the file (4.3 B), we pay transcription twice.
- New Swift-helper contract (4.1 A) adds a deploy surface — the native helper
  is currently frozen for multi-months at a time.

## 6. Proposed default shape (for discussion)

- **Capture:** 4.1 B (parallel MediaRecorder) for the first iteration. Zero
  Swift changes, ships fast, the double-capture caveat is acceptable for an
  explicit beta. Upgrade to 4.1 A later if quality/battery warrants it.
- **Pipeline:** 4.2 A (extend `DictationSessionManager` with a session kind
  flag). One service, one SSE channel family, one VAD path.
- **Finalisation:** 4.3 B (stream for UX, re-run file for persistence). The
  quality regression of `BeamSize=1` is unacceptable as the canonical
  transcript for a saved recording; re-run is 30–90 s for a 10-min session on
  M1, fine inside the post-Stop job.
- **UI:** new `RecordingPartialsNotifier` + SSE + `<LiveTranscript />`
  component embedded in the active-session card.

## 7. Open questions (need user decision before ADR)

- **Q1.** 4.1 A vs. 4.1 B — is the double-capture acceptable for v1? Or do we
  want a clean native-tap from the start and ship slower?
- **Q2.** Stream quality vs. twice-transcribed — is `BeamSize=5` re-run worth
  the extra 30–90 s/10-min-session of compute on Stop, or do we accept the
  stream's `BeamSize=1` result as canonical?
- **Q3.** Model size policy while streaming. Current settings have a single
  `WhisperModelPath` shared by dictation and file transcription. Is streaming
  allowed to use the same large model the file pipeline uses, or do we pin a
  smaller "streaming" model via a new setting?
- **Q4.** UX — when streaming dies mid-session (network, OOM), do we (a) hide
  the live view silently and fall back to the file-only flow, or (b) surface a
  banner "live transcript interrupted, full transcript will be ready on Stop"?
- **Q5.** Long-session bound. Dictation is minutes-long; recording can be
  hours. `TranscribeStreamAsync` has a 15 s max-buffer window but the
  `committed` StringBuilder grows unbounded across the session. For a 3-hour
  meeting that is fine in memory (~500 KB text), but do we want to periodically
  flush to the DB as checkpoints so crash recovery does not lose the live
  text?
- **Q6.** Does the live view need word-level timing? Whisper exposes
  segment-level timestamps only; word-level requires a different decode path
  (whisper.cpp `--word_timestamps`) and is not free.

## 8. Not-in-this-grooming

- Diarization / speaker labels on the live stream (python-sidecar silero-vad
  plus resemblyzer could do it, but adds a separate sidecar-in-the-loop and a
  whole layer of speaker-turn stability UX).
- RAG indexing of partials (wait for the finalised transcript).
- iOS / Windows capture. The Swift tap option (4.1 A) is macOS-only; the
  parallel-MediaRecorder option (4.1 B) is portable but this app is mac-only
  today anyway.

## 9. Next step

User review of §7 Q1–Q6. Once decisions land, flip this into an ADR under
`docs/features/recording/decisions/` and retire the one-liner backlog file
into `.archive/`.
