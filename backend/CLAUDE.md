# Backend — guide for AI agents

ASP.NET Minimal API on .NET 10. Clean-architecture split:

```
src/
├── Mozgoslav.Domain/         entities, value objects, enums, pure domain services. Zero external deps.
├── Mozgoslav.Application/    use cases, port interfaces (I*Repository, ITranscriptionService, ILlmService, IMarkdownExporter, IAppSettings, IJobProgressNotifier), MarkdownGenerator, CorrectionService.
├── Mozgoslav.Infrastructure/ EF Core DbContext + Ef* repositories, services for Whisper.net / OpenAI SDK / ffmpeg / Obsidian / Meetily / Model downloads, Serilog integration, MozgoslavMetrics (System.Diagnostics.Metrics), NoopAudioRecorder.
└── Mozgoslav.Api/            Program.cs (DI composition root), endpoint modules (Health, Recording, Job, Note, Profile, Settings, Model, Meetily, Obsidian, Sse, Logs, Backup), QueueBackgroundService (hosted), OpenTelemetry metrics.
```

## Key architectural decisions

1. **Native Whisper.net (not subprocess)** — `WhisperNetTranscriptionService` uses `Whisper.net`/`Whisper.net.Runtime.CoreML`. macOS: CoreML acceleration via `.mlmodelc` companion next to the ggml file. Linux/Windows builds: falls back to CPU silently (user gets a clear error if model path is unset).
2. **OpenAI SDK → OpenAI-compatible endpoints** (LM Studio / Ollama). `response_format=json_schema`. Text > 24k chars is chunked and merged (`OpenAiCompatibleLlmService.Chunk/Merge`).
3. **EF Core + SQLite** (team C# service style). `MozgoslavDbContext` with `OnModelCreating` + value converters (enums → strings, lists → JSON). `EnsureCreatedAsync` on startup via `DatabaseInitializer`.
4. **`Channel<T>` fan-out** for job progress (`ChannelJobProgressNotifier`). SSE endpoint (`GET /api/jobs/stream`) pipes every update to every subscriber. Non-blocking on publish.
5. **Graceful degradation** — LLM unreachable → skip summary, keep raw transcript. Export fails → note still saved, user can retry from `POST /api/notes/{id}/export`.
6. **Idempotent imports** — `sha256` unique index on `recordings`. Re-importing the same file returns the original Recording unchanged.
7. **Background queue** — `QueueBackgroundService` (HostedService) loops with 2s idle delay; polls via `IProcessingJobRepository.DequeueNextAsync()`. Single exception in one job never stalls the queue (`ProcessQueueWorker.ProcessNextAsync` catches + marks `Failed`).
8. **ADR-005 RAG** — `Application/Rag/` owns the pipeline (`IEmbeddingService`, `IVectorIndex`, `IRagService`, `NoteChunker`, `RagService`). MVP infrastructure: `BagOfWordsEmbeddingService` (deterministic, zero deps) and `InMemoryVectorIndex` (brute-force cosine). Answer synthesis routes through `ILlmService`; the LLM layer is graceful — if the endpoint is down we return the raw citation bundle. Drop-in replacements for production: sentence-transformers via Python sidecar / ONNX for embeddings, `sqlite-vss` for the index.
9. **ADR-004 R4 idle-unload** — `IdleResourceCache<T>` in Infrastructure keeps `WhisperFactory` warm between transcriptions and disposes it after `DictationModelUnloadMinutes` of inactivity. Reload adds ~1-2 s to the next first call.

## Endpoints

```
GET    /api/health
GET    /api/health/llm
GET    /api/recordings
GET    /api/recordings/{id}
POST   /api/recordings/import          { filePaths[], profileId? }
POST   /api/recordings/upload          multipart
POST   /api/recordings/{id}/reprocess  { profileId }
GET    /api/recordings/{id}/notes
GET    /api/jobs | /api/jobs/active
GET    /api/jobs/stream                (SSE)
POST   /api/jobs                       { recordingId, profileId }
GET    /api/notes | /api/notes/{id}
POST   /api/notes/{id}/export
GET    /api/profiles | /api/profiles/{id}
POST   /api/profiles | PUT /api/profiles/{id}
GET    /api/settings | PUT /api/settings
GET    /api/models | POST /api/models/download { id }
POST   /api/meetily/import             { meetilyDatabasePath }
POST   /api/obsidian/setup             { vaultPath? }
GET    /api/logs | GET /api/logs/tail?file=&lines=
GET    /api/backup | POST /api/backup/create
POST   /api/rag/reindex                (re-embeds all notes)
POST   /api/rag/query                  { question, topK? }
GET    /api/sync/status | GET /api/sync/health
GET    /api/sync/pairing-payload       (mozgoslav:// URI for QR code)
POST   /api/sync/accept-device         { deviceId, name, folderIds? }
GET    /api/sync/events                (SSE bridge over /rest/events)
```

## Extension points

- New service: implement an interface in `Application/Interfaces/`, register in `Program.cs`.
- New endpoint: add a file under `Api/Endpoints/Foo.cs` with `public static IEndpointRouteBuilder MapFooEndpoints(this IEndpointRouteBuilder endpoints)`, call `.MapFooEndpoints()` in `Program.cs`.
- Schema change: touch the corresponding `Domain/Entities` + `MozgoslavDbContext.OnModelCreating`. Delete local `mozgoslav.db` on dev boxes (EnsureCreated is not a migration tool).

## Testing

- Unit tests (`tests/Mozgoslav.Tests/`): pure domain + application. MSTest + NSubstitute + FluentAssertions.
- Integration tests (`tests/Mozgoslav.Tests.Integration/`): real SQLite via `TestDatabase`, and WireMock available for future HTTP contract tests.
- Commands: `dotnet test -maxcpucount:1` (respect the workspace's CPU rule).
