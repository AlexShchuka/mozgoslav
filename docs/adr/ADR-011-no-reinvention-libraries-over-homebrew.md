# ADR-011 — Backend: библиотеки вместо велосипедов

- **Status:** Proposed
- **Date:** 2026-04-17
- **Scope:** backend (.NET 10). Только замены custom-кода на standard-библиотеки. Не про новую функциональность.

## Политика

В shipped-коде нет своих реализаций того, что уже делают mainstream-библиотеки. Каждый пункт ниже — велосипед, который заменяется библиотекой.

## Замены

### 1. Очередь фоновых работ
- **Велосипед:** `Infrastructure.Services/QueueBackgroundService` + `Application.Interfaces/IProcessingJobRepository` + `Application.UseCases/ProcessQueueWorker` + `ReconcileAsync_StuckInFlightJobs_FlipsToQueued`.
- **Замена:** Quartz.NET + `Quartz.Extensions.Hosting` + AdoJobStore/SQLite.
- **Что поправить:** JobDetail + Trigger вместо ручной таблицы `processing_jobs`, misfire-policy вместо `ReconcileAsync`, built-in recovery вместо `IJobProgressNotifier`-костылей.

### 2. Idle-кэш ресурсов
- **Велосипед:** `Infrastructure.Services/IdleResourceCache<T>` + `Application.Interfaces/IIdleResourceCache<T>`.
- **Замена:** `Microsoft.Extensions.Caching.Memory.MemoryCache` с `MemoryCacheEntryOptions.SlidingExpiration` + `PostEvictionCallbacks` для `Dispose()`.
- **Что поправить:** удалить обёртку, звать `IMemoryCache` напрямую в `WhisperNetTranscriptionService`.

### 3. HTTP-клиенты
- **Велосипед:** raw `HttpClient` в `AnthropicLlmProvider`, `OllamaLlmProvider`, `OpenAiCompatibleLlmProvider`, `PythonSidecarClient`, `ObsidianRestApiClient` — без retry/timeout/circuit-breaker.
- **Замена:** `Microsoft.Extensions.Http.Resilience` (пакет из .NET 10) через `AddStandardResilienceHandler()`.
- **Что поправить:** `Program.cs` DI — обернуть каждый `AddHttpClient(...)` в `.AddStandardResilienceHandler()` с настройками (timeout 30s, retry 3 с экспонентой, circuit-breaker 5/30s).

### 4. Миграции БД
- **Велосипед:** кастомные `Infrastructure.Persistence.Migrations/0001_*.cs..0013_*.cs` с собственным runner'ом.
- **Замена:** EF Core Migrations (`dotnet ef migrations add`). EF Core уже в проекте — DbContext есть.
- **Что поправить:** baseline-миграция с текущего состояния, удалить свой runner, перевести `DatabaseInitializer` на `DbContext.Database.MigrateAsync()`.

### 5. Токенизация + чанкинг LLM-контекста
- **Велосипед:** `Infrastructure.Services/OpenAiCompatibleLlmService.Chunk/Merge` (символьная эвристика) + `LlmCorrectionChunker` (overlapping windows вручную).
- **Замена:** `Microsoft.ML.Tokenizers` (официальный .NET, поддерживает tiktoken/BPE для GPT/Claude-семейств).
- **Что поправить:** `Chunk` — через `Tokenizer.EncodeToIds` по токенам, не по символам. Overlap и merge — через tokenizer-aware splitter.

### 6. Background-lifecycle
- **Велосипед:** `IHostedService` ручки (`DatabaseInitializer`, `QueueBackgroundService`, `ModelDownloadCoordinator`) без унификации.
- **Замена:** `BackgroundService` (от Microsoft.Extensions.Hosting) для всех трёх, либо Quartz Jobs где уместен scheduling.

### 7. SSE-протокол
- **Велосипед:** `ChannelJobProgressNotifier` + `SseEndpoints.cs` вручную пишут `data: ...\n\n` в response stream.
- **Замена:** `Microsoft.AspNetCore.Components.Server` SSE helpers или `System.ServerSentEvents` (nuget).
- **Что поправить:** endpoint возвращает `IAsyncEnumerable<SseEvent>`, фреймворк сам форматит.

### 8. Process spawning для ffmpeg
- **Велосипед:** `FfmpegAudioConverter` / `FfmpegPcmDecoder` — `Process.Start` + ручной stderr парсинг.
- **Замена:** `CliWrap` nuget — typed process API, async stdout/stderr streams, timeout + cancellation.

### 9. Retry/Polly в model download
- **Велосипед:** `ModelDownloadService` имеет свою логику попыток скачивания.
- **Замена:** та же `Microsoft.Extensions.Http.Resilience` — скачивание уходит в HttpClient, resilience сверху.

## Не велосипеды (сознательно оставлено)

- `Channel<T>` для SSE — нативный API, не требует обёртки.
- `IAudioRecorder` + `AVFoundationAudioRecorder` — контракт над native helper, не замена standard library.
- `GlossaryApplicator` — чистая доменная логика, не инфраструктура.
- `FillerCleaner` — regex cleanup, специфичен для русского языка.
- `HashCalculator` — тонкая обёртка над `SHA256.HashData`, не стоит удалять.
- `JSON-RPC поверх stdin/stdout helper` — Swift-сторона не использует .NET, кросс-платформенный stub неизбежен.

## Порядок миграции

1. EF Core Migrations baseline — один PR, минимум риска.
2. `MemoryCache` вместо `IdleResourceCache` — один PR, узкий scope.
3. `HttpResilience` ко всем HTTP-клиентам — один PR.
4. `Microsoft.ML.Tokenizers` — один PR с переработкой chunker-ов.
5. `CliWrap` для ffmpeg — один PR.
6. Quartz.NET — отдельный PR (большой, переписывает очередь + тесты).
7. SSE стандартизация — в зависимости от выбранной lib, PR маленький.

Каждый PR — не больше одного велосипеда за раз.
