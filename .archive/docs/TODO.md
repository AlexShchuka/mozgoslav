# Mozgoslav Backend — TODO

Items deferred from the Iteration 0 scaffold. Ordered roughly by upcoming iteration.

## Iteration 1 (finish storage layer)

- Replace `InMemoryProfileRepository` with `SqliteProfileRepository` (Dapper) and seed built-in profiles on first run.
- Replace `InMemoryProcessingJobRepository` with `SqliteProcessingJobRepository` (Dapper).
- Add `SqliteTranscriptRepository` and `SqliteProcessedNoteRepository` with JSON-column (de)serialization for
  `segments_json`, `action_items_json`, etc.
- Integration tests for each repository (add/get/update/delete round-trips).

## Iteration 2 (audio pipeline)

- `FfmpegAudioConverter` via `System.Diagnostics.Process` → 16 kHz mono WAV.
- `WhisperNetTranscriptionService` wrapping `Whisper.net` with spec parameters (beam=5, bestOf=5, maxContext=0,
  suppressNst=true, Silero VAD).
- `QueueBackgroundService` (`IHostedService`) calling a `ProcessQueueWorker`.
- `POST /api/recordings/import` integration test via `WebApplicationFactory`.
- `GET /api/jobs/stream` Server-Sent Events endpoint + `IJobProgressNotifier` using `Channel<T>`.

## Iteration 3 (LLM and export)

- `OpenAiCompatibleLlmService` (OpenAI SDK → LM Studio / Ollama) with JSON-mode output and chunk/merge fallback for long
  transcripts.
- `FileMarkdownExporter` implementing BACKEND-SPEC §4.3 frontmatter + body template.
- `ReprocessUseCase`.
- Endpoints: `/api/notes`, `/api/notes/{id}`, `/api/notes/{id}/reprocess`, `/api/notes/{id}/export`, `/api/profiles` (
  CRUD), `/api/settings`, `/api/health/llm`.

## Iteration 6 (recording)

- macOS-only audio recorder implementation (`IAudioRecorder`) — not buildable on this Linux sandbox. Will likely live
  behind a platform-conditional project reference; confirm strategy before adding.

## Infrastructure / ops

- `~/Library/Application Support/Mozgoslav/secondbrain.db` path resolution on macOS; platform-aware app-data folder for
  dev on Linux/Windows.
- Structured logging config (scopes, JSON output in production) — ILogger only per current rules.
- Graceful-degradation tests for unavailable LLM endpoint.
