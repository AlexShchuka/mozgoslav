# Mozgoslav for Conversations — Backend Specification (C#)

**Цель документа:** полная спецификация C# бэкенда. По этому файлу можно восстановить контекст и реализовать с нуля.

---

## 1. Solution Structure

```
Mozgoslav.sln
├── src/
│   ├── Mozgoslav.Domain/           ← чистая доменная модель, 0 зависимостей
│   ├── Mozgoslav.Application/      ← use cases, interfaces (порты), pipeline
│   ├── Mozgoslav.Infrastructure/   ← реализации: Whisper.net, LLM, SQLite, ffmpeg
│   └── Mozgoslav.Api/              ← ASP.NET Minimal API, DI, запуск
├── tests/
│   ├── Mozgoslav.Tests/            ← unit tests (xUnit + NSubstitute)
│   └── Mozgoslav.Tests.Integration/← integration tests
├── Directory.Build.props             ← общие настройки
├── Directory.Packages.props          ← централизованные версии NuGet
└── .editorconfig                     ← code style
```

**Target framework:** .NET 9.0 (LTS)
**Nullable:** enable
**ImplicitUsings:** enable

---

## 2. Dependency Rules (Clean Architecture)

```
Domain ← ничего не знает о других слоях
Application ← зависит от Domain
Infrastructure ← зависит от Application + Domain
Api ← зависит от Application + Infrastructure (для DI registration)
Tests ← зависит от всех
```

**Domain НЕ ссылается** на Application, Infrastructure, Api, NuGet-пакеты (кроме System.*).
**Application НЕ ссылается** на Infrastructure. Только интерфейсы (порты).
**Infrastructure** реализует интерфейсы из Application.

---

## 3. Domain Layer

### 3.1 Entities

```csharp
namespace Mozgoslav.Domain.Entities;

public class Recording
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string FileName { get; init; } = string.Empty;
    public string FilePath { get; init; } = string.Empty;
    public string Sha256 { get; init; } = string.Empty;
    public TimeSpan Duration { get; set; }
    public AudioFormat Format { get; init; }
    public SourceType SourceType { get; init; }
    public RecordingStatus Status { get; set; } = RecordingStatus.New;
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

public class Transcript
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid RecordingId { get; init; }
    public string ModelUsed { get; init; } = string.Empty;
    public string Language { get; init; } = "ru";
    public string RawText { get; set; } = string.Empty;
    public List<TranscriptSegment> Segments { get; set; } = new();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

public class ProcessedNote
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid TranscriptId { get; init; }
    public Guid ProfileId { get; init; }
    public int Version { get; init; } = 1;
    public string Summary { get; set; } = string.Empty;
    public List<string> KeyPoints { get; set; } = new();
    public List<string> Decisions { get; set; } = new();
    public List<ActionItem> ActionItems { get; set; } = new();
    public List<string> UnresolvedQuestions { get; set; } = new();
    public List<string> Participants { get; set; } = new();
    public string Topic { get; set; } = string.Empty;
    public ConversationType ConversationType { get; set; } = ConversationType.Other;
    public string CleanTranscript { get; set; } = string.Empty;
    public string FullTranscript { get; set; } = string.Empty;
    public List<string> Tags { get; set; } = new();
    public string MarkdownContent { get; set; } = string.Empty;
    public bool ExportedToVault { get; set; }
    public string? VaultPath { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

public class Profile
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string SystemPrompt { get; set; } = string.Empty;
    public string OutputTemplate { get; set; } = string.Empty;
    public CleanupLevel CleanupLevel { get; set; } = CleanupLevel.Light;
    public string ExportFolder { get; set; } = "_inbox";
    public List<string> AutoTags { get; set; } = new();
    public bool IsDefault { get; set; }
    public bool IsBuiltIn { get; set; }
}

public class ProcessingJob
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid RecordingId { get; init; }
    public Guid ProfileId { get; init; }
    public JobStatus Status { get; set; } = JobStatus.Queued;
    public int Progress { get; set; }
    public string? CurrentStep { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
}
```

### 3.2 Value Objects

```csharp
namespace Mozgoslav.Domain.ValueObjects;

public record TranscriptSegment(TimeSpan Start, TimeSpan End, string Text);

public record ActionItem(string Person, string Task, string? Deadline);
```

### 3.3 Enums

```csharp
namespace Mozgoslav.Domain.Enums;

public enum AudioFormat { Mp3, M4a, Wav, Mp4, Ogg, Flac, Webm, Aac }
public enum SourceType { Recorded, Imported }
public enum RecordingStatus { New, Transcribing, Transcribed, Failed }
public enum JobStatus { Queued, Transcribing, Correcting, Summarizing, Exporting, Done, Failed }
public enum ConversationType { Meeting, OneOnOne, Idea, Personal, Other }
public enum CleanupLevel { None, Light, Aggressive }
```

### 3.4 Domain Services

```csharp
namespace Mozgoslav.Domain.Services;

public static class FillerCleaner
{
    private static readonly string[] Fillers = {
        "ну", "это", "типа", "короче", "вот", "блин", "значит",
        "как бы", "в общем", "в принципе", "так сказать",
        "эээ", "ээ", "эх", "мм", "ммм", "мммм", "эм", "ээм"
    };

    public static string Clean(string text, CleanupLevel level)
    {
        if (level == CleanupLevel.None) return text;
        // regex: удаление filler-слов, дублей, нормализация пробелов
        // level == Aggressive: также удаляет "ну вот", "ну это", "ну типа"
    }
}

public static class AudioFormatDetector
{
    public static AudioFormat FromExtension(string extension) => extension.ToLower() switch
    {
        ".mp3" => AudioFormat.Mp3,
        ".m4a" => AudioFormat.M4a,
        ".wav" => AudioFormat.Wav,
        // ...
        _ => throw new ArgumentException($"Unsupported format: {extension}")
    };
}

public static class HashCalculator
{
    public static async Task<string> Sha256Async(string filePath, CancellationToken ct = default);
}
```

---

## 4. Application Layer

### 4.1 Interfaces (порты)

```csharp
namespace Mozgoslav.Application.Interfaces;

// --- STT ---
public interface ITranscriptionService
{
    Task<IReadOnlyList<TranscriptSegment>> TranscribeAsync(
        string audioPath,
        string language,
        string? initialPrompt,
        IProgress<int>? progress,
        CancellationToken ct);
}

// --- LLM ---
public interface ILlmService
{
    Task<LlmProcessingResult> ProcessAsync(
        string transcript,
        string systemPrompt,
        CancellationToken ct);

    Task<bool> IsAvailableAsync(CancellationToken ct);
}

public record LlmProcessingResult(
    string Summary,
    List<string> KeyPoints,
    List<string> Decisions,
    List<ActionItem> ActionItems,
    List<string> UnresolvedQuestions,
    List<string> Participants,
    string Topic,
    ConversationType ConversationType,
    List<string> Tags);

// --- Audio ---
public interface IAudioConverter
{
    Task<string> ConvertToWavAsync(string inputPath, CancellationToken ct);
    // Returns path to temp WAV 16kHz mono
}

public interface IAudioRecorder
{
    Task StartRecordingAsync(string outputPath, CancellationToken ct);
    Task StopRecordingAsync();
    bool IsRecording { get; }
    TimeSpan CurrentDuration { get; }
}

// --- Export ---
public interface IMarkdownExporter
{
    Task<string> ExportAsync(ProcessedNote note, Profile profile, string vaultPath, CancellationToken ct);
    // Returns: full path to written .md file
}

// --- Repositories ---
public interface IRecordingRepository
{
    Task<Recording> AddAsync(Recording recording, CancellationToken ct);
    Task<Recording?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Recording?> GetBySha256Async(string sha256, CancellationToken ct);
    Task<IReadOnlyList<Recording>> GetAllAsync(CancellationToken ct);
    Task UpdateAsync(Recording recording, CancellationToken ct);
}

public interface ITranscriptRepository
{
    Task<Transcript> AddAsync(Transcript transcript, CancellationToken ct);
    Task<Transcript?> GetByRecordingIdAsync(Guid recordingId, CancellationToken ct);
    Task<Transcript?> GetByIdAsync(Guid id, CancellationToken ct);
}

public interface IProcessedNoteRepository
{
    Task<ProcessedNote> AddAsync(ProcessedNote note, CancellationToken ct);
    Task<IReadOnlyList<ProcessedNote>> GetByTranscriptIdAsync(Guid transcriptId, CancellationToken ct);
    Task<ProcessedNote?> GetByIdAsync(Guid id, CancellationToken ct);
    Task UpdateAsync(ProcessedNote note, CancellationToken ct);
}

public interface IProfileRepository
{
    Task<IReadOnlyList<Profile>> GetAllAsync(CancellationToken ct);
    Task<Profile?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<Profile> GetDefaultAsync(CancellationToken ct);
    Task<Profile> AddAsync(Profile profile, CancellationToken ct);
    Task UpdateAsync(Profile profile, CancellationToken ct);
}

public interface IProcessingJobRepository
{
    Task<ProcessingJob> EnqueueAsync(ProcessingJob job, CancellationToken ct);
    Task<ProcessingJob?> DequeueNextAsync(CancellationToken ct);
    Task UpdateAsync(ProcessingJob job, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetByRecordingIdAsync(Guid recordingId, CancellationToken ct);
    Task<IReadOnlyList<ProcessingJob>> GetActiveAsync(CancellationToken ct);
}

// --- Settings ---
public interface IAppSettings
{
    string VaultPath { get; }
    string LlmEndpoint { get; }    // http://localhost:1234
    string WhisperModelPath { get; }
    string Language { get; }        // "ru"
    int WhisperThreads { get; }    // 14
    Task SaveAsync(AppSettingsDto dto, CancellationToken ct);
    Task<AppSettingsDto> LoadAsync(CancellationToken ct);
}
```

### 4.2 Use Cases

```csharp
namespace Mozgoslav.Application.UseCases;

// --- Import ---
public class ImportRecordingUseCase(
    IRecordingRepository recordings,
    IProcessingJobRepository jobs,
    IProfileRepository profiles)
{
    public async Task<List<Recording>> ExecuteAsync(
        IReadOnlyList<string> filePaths,
        Guid? profileId,
        CancellationToken ct)
    {
        var profile = profileId.HasValue
            ? await profiles.GetByIdAsync(profileId.Value, ct)
            : await profiles.GetDefaultAsync(ct);

        var result = new List<Recording>();
        foreach (var path in filePaths)
        {
            var sha256 = await HashCalculator.Sha256Async(path, ct);
            var existing = await recordings.GetBySha256Async(sha256, ct);
            if (existing != null) { result.Add(existing); continue; } // idempotent

            var recording = new Recording
            {
                FileName = Path.GetFileName(path),
                FilePath = path, // будет скопирован в app storage
                Sha256 = sha256,
                Format = AudioFormatDetector.FromExtension(Path.GetExtension(path)),
                SourceType = SourceType.Imported,
            };
            await recordings.AddAsync(recording, ct);
            await jobs.EnqueueAsync(new ProcessingJob
            {
                RecordingId = recording.Id,
                ProfileId = profile!.Id,
            }, ct);
            result.Add(recording);
        }
        return result;
    }
}

// --- Process Queue (background worker) ---
public class ProcessQueueWorker(
    IProcessingJobRepository jobs,
    IRecordingRepository recordings,
    ITranscriptRepository transcripts,
    IProcessedNoteRepository notes,
    IProfileRepository profiles,
    IAudioConverter audioConverter,
    ITranscriptionService transcriptionService,
    ILlmService llmService,
    IMarkdownExporter exporter,
    IAppSettings settings,
    IJobProgressNotifier progressNotifier)
{
    public async Task ProcessNextAsync(CancellationToken ct)
    {
        var job = await jobs.DequeueNextAsync(ct);
        if (job == null) return;

        try
        {
            job.Status = JobStatus.Transcribing;
            job.StartedAt = DateTime.UtcNow;
            await jobs.UpdateAsync(job, ct);
            await progressNotifier.NotifyAsync(job);

            var recording = await recordings.GetByIdAsync(job.RecordingId, ct);
            var profile = await profiles.GetByIdAsync(job.ProfileId, ct);

            // Step 1: Convert audio
            var wavPath = await audioConverter.ConvertToWavAsync(recording!.FilePath, ct);

            // Step 2: Transcribe
            var segments = await transcriptionService.TranscribeAsync(
                wavPath, settings.Language, profile!.SystemPrompt,
                new Progress<int>(p => { job.Progress = p / 3; _ = progressNotifier.NotifyAsync(job); }),
                ct);

            var transcript = new Transcript
            {
                RecordingId = recording.Id,
                ModelUsed = Path.GetFileName(settings.WhisperModelPath),
                Language = settings.Language,
                RawText = string.Join(" ", segments.Select(s => s.Text)),
                Segments = segments.ToList(),
            };
            await transcripts.AddAsync(transcript, ct);

            // Step 3: Cleanup
            job.Status = JobStatus.Correcting; job.Progress = 33;
            await jobs.UpdateAsync(job, ct);
            await progressNotifier.NotifyAsync(job);

            var cleanText = FillerCleaner.Clean(transcript.RawText, profile.CleanupLevel);

            // Step 4: LLM Summarize
            job.Status = JobStatus.Summarizing; job.Progress = 50;
            await jobs.UpdateAsync(job, ct);
            await progressNotifier.NotifyAsync(job);

            LlmProcessingResult? llmResult = null;
            if (await llmService.IsAvailableAsync(ct))
            {
                llmResult = await llmService.ProcessAsync(cleanText, profile.SystemPrompt, ct);
            }

            // Step 5: Create ProcessedNote
            var note = new ProcessedNote
            {
                TranscriptId = transcript.Id,
                ProfileId = profile.Id,
                Summary = llmResult?.Summary ?? "",
                KeyPoints = llmResult?.KeyPoints ?? new(),
                Decisions = llmResult?.Decisions ?? new(),
                ActionItems = llmResult?.ActionItems ?? new(),
                UnresolvedQuestions = llmResult?.UnresolvedQuestions ?? new(),
                Participants = llmResult?.Participants ?? new(),
                Topic = llmResult?.Topic ?? recording.FileName,
                ConversationType = llmResult?.ConversationType ?? ConversationType.Other,
                CleanTranscript = cleanText,
                FullTranscript = transcript.RawText,
                Tags = llmResult?.Tags ?? new(),
            };

            // Step 6: Generate markdown
            note.MarkdownContent = MarkdownGenerator.Generate(note, profile, recording);

            // Step 7: Export
            job.Status = JobStatus.Exporting; job.Progress = 85;
            await jobs.UpdateAsync(job, ct);
            await progressNotifier.NotifyAsync(job);

            if (!string.IsNullOrEmpty(settings.VaultPath))
            {
                note.VaultPath = await exporter.ExportAsync(note, profile, settings.VaultPath, ct);
                note.ExportedToVault = true;
            }

            await notes.AddAsync(note, ct);

            recording.Status = RecordingStatus.Transcribed;
            recording.Duration = segments.Last().End;
            await recordings.UpdateAsync(recording, ct);

            job.Status = JobStatus.Done; job.Progress = 100;
            job.FinishedAt = DateTime.UtcNow;
            await jobs.UpdateAsync(job, ct);
            await progressNotifier.NotifyAsync(job);
        }
        catch (Exception ex)
        {
            job.Status = JobStatus.Failed;
            job.ErrorMessage = ex.Message;
            job.FinishedAt = DateTime.UtcNow;
            await jobs.UpdateAsync(job, ct);
            await progressNotifier.NotifyAsync(job);
        }
    }
}

// --- Reprocess ---
public class ReprocessUseCase(
    ITranscriptRepository transcripts,
    IProcessedNoteRepository notes,
    IProfileRepository profiles,
    ILlmService llmService,
    IMarkdownExporter exporter,
    IAppSettings settings)
{
    public async Task<ProcessedNote> ExecuteAsync(Guid recordingId, Guid profileId, CancellationToken ct)
    {
        // Берёт существующий transcript, прогоняет через новый profile
        // version = max + 1
    }
}

// --- Progress Notifier (SSE → frontend) ---
public interface IJobProgressNotifier
{
    Task NotifyAsync(ProcessingJob job);
    IAsyncEnumerable<ProcessingJob> SubscribeAsync(CancellationToken ct);
}
```

### 4.3 Markdown Generator (Domain Service)

```csharp
namespace Mozgoslav.Application.Services;

public static class MarkdownGenerator
{
    public static string Generate(ProcessedNote note, Profile profile, Recording recording)
    {
        var sb = new StringBuilder();

        // Frontmatter
        sb.AppendLine("---");
        sb.AppendLine($"type: conversation");
        sb.AppendLine($"profile: {profile.Name.ToLower()}");
        sb.AppendLine($"date: {recording.CreatedAt:yyyy-MM-dd}");
        sb.AppendLine($"duration: \"{recording.Duration:hh\\:mm\\:ss}\"");
        sb.AppendLine($"topic: \"{note.Topic}\"");
        sb.AppendLine($"conversation_type: {note.ConversationType.ToString().ToLower()}");
        if (note.Participants.Any())
            sb.AppendLine($"participants: [{string.Join(", ", note.Participants)}]");
        if (note.Tags.Any())
            sb.AppendLine($"tags: [{string.Join(", ", note.Tags)}]");
        sb.AppendLine($"source_audio: \"{recording.FileName}\"");
        sb.AppendLine($"processing_version: {note.Version}");
        sb.AppendLine("---");
        sb.AppendLine();

        // Body sections
        if (!string.IsNullOrEmpty(note.Summary))
        {
            sb.AppendLine("## Summary");
            sb.AppendLine(note.Summary);
            sb.AppendLine();
        }
        if (note.KeyPoints.Any()) { /* ## Ключевые тезисы */ }
        if (note.Decisions.Any()) { /* ## Решения */ }
        if (note.ActionItems.Any()) { /* ## Action Items */ }
        if (note.UnresolvedQuestions.Any()) { /* ## Вопросы без ответа */ }
        if (note.Participants.Any()) { /* ## Участники — wiki-links [[Name]] */ }
        // ## Clean Transcript
        // ## Full Transcript

        return sb.ToString();
    }
}
```

---

## 5. Infrastructure Layer

### 5.1 NuGet пакеты

```xml
<!-- Mozgoslav.Infrastructure.csproj -->
<PackageReference Include="Whisper.net" />
<PackageReference Include="Whisper.net.Runtime.CoreML" />  <!-- Apple Silicon GPU -->
<PackageReference Include="OpenAI" />                       <!-- OpenAI SDK for .NET -->
<PackageReference Include="Microsoft.Data.Sqlite" />
<PackageReference Include="Dapper" />                       <!-- лёгкий ORM поверх SQLite -->
```

### 5.2 Whisper.net Implementation

```csharp
namespace Mozgoslav.Infrastructure.Services;

public class WhisperNetTranscriptionService : ITranscriptionService
{
    private readonly string _modelPath;

    // Параметры (проверены в бою, из ADR):
    // beam_size = 5
    // best_of = 5
    // max_context = 0  (против галлюцинаций)
    // suppress_nst = true
    // language = "ru"
    // threads = 14 (Apple Silicon M3/M4)
    // VAD: Silero v6.2.0 (ggml binary рядом с whisper моделью)

    // Initial prompt (зашит, пользователь может перекрыть в Profile):
    // "Мысли вслух, встречи, диалоги, рассуждения."

    public async Task<IReadOnlyList<TranscriptSegment>> TranscribeAsync(
        string audioPath, string language, string? initialPrompt,
        IProgress<int>? progress, CancellationToken ct)
    {
        using var processor = WhisperProcessor.CreateBuilder()
            .WithModel(_modelPath)
            .WithLanguage(language)
            .WithBeamSize(5)
            .WithBestOf(5)
            .WithPrompt(initialPrompt ?? "Мысли вслух, встречи, диалоги, рассуждения.")
            .WithSuppressNonSpeechTokens(true)
            .Build();

        var segments = new List<TranscriptSegment>();
        await foreach (var seg in processor.ProcessAsync(File.OpenRead(audioPath), ct))
        {
            segments.Add(new TranscriptSegment(seg.Start, seg.End, seg.Text));
            progress?.Report(/* approximate % */);
        }
        return segments;
    }
}
```

### 5.3 LLM Client (OpenAI-compatible → LM Studio)

```csharp
namespace Mozgoslav.Infrastructure.Services;

public class OpenAiCompatibleLlmService : ILlmService
{
    private readonly OpenAIClient _client;
    // BaseUrl: http://localhost:1234 (LM Studio, настраивается в Settings)
    // Model: "default" (LM Studio подставляет загруженную)
    // Temperature: 0.1 (для структурированного output)
    // Response format: JSON

    public async Task<LlmProcessingResult> ProcessAsync(
        string transcript, string systemPrompt, CancellationToken ct)
    {
        // 1. Если transcript > 30K символов → chunk + MapReduce
        // 2. System prompt из Profile
        // 3. Parse JSON response
        // 4. Если JSON невалидный → retry 1 раз → fallback: plain text summary
    }

    public async Task<bool> IsAvailableAsync(CancellationToken ct)
    {
        // GET /v1/models → true если LM Studio отвечает
    }
}
```

### 5.4 SQLite Schema

```sql
CREATE TABLE recordings (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    sha256 TEXT NOT NULL UNIQUE,
    duration_ms INTEGER DEFAULT 0,
    format TEXT NOT NULL,
    source_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    created_at TEXT NOT NULL
);

CREATE TABLE transcripts (
    id TEXT PRIMARY KEY,
    recording_id TEXT NOT NULL REFERENCES recordings(id),
    model_used TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'ru',
    raw_text TEXT NOT NULL,
    segments_json TEXT NOT NULL,  -- JSON array of {start_ms, end_ms, text}
    created_at TEXT NOT NULL
);

CREATE TABLE processed_notes (
    id TEXT PRIMARY KEY,
    transcript_id TEXT NOT NULL REFERENCES transcripts(id),
    profile_id TEXT NOT NULL REFERENCES profiles(id),
    version INTEGER NOT NULL DEFAULT 1,
    summary TEXT,
    key_points_json TEXT,       -- JSON array
    decisions_json TEXT,
    action_items_json TEXT,     -- JSON array of {person, task, deadline}
    unresolved_questions_json TEXT,
    participants_json TEXT,
    topic TEXT,
    conversation_type TEXT,
    clean_transcript TEXT,
    full_transcript TEXT,
    tags_json TEXT,
    markdown_content TEXT,
    exported_to_vault INTEGER DEFAULT 0,
    vault_path TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    output_template TEXT,
    cleanup_level TEXT NOT NULL DEFAULT 'Light',
    export_folder TEXT DEFAULT '_inbox',
    auto_tags_json TEXT,
    is_default INTEGER DEFAULT 0,
    is_built_in INTEGER DEFAULT 0
);

CREATE TABLE processing_jobs (
    id TEXT PRIMARY KEY,
    recording_id TEXT NOT NULL REFERENCES recordings(id),
    profile_id TEXT NOT NULL REFERENCES profiles(id),
    status TEXT NOT NULL DEFAULT 'Queued',
    progress INTEGER DEFAULT 0,
    current_step TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

### 5.5 Built-in Profiles (seed data)

```csharp
public static class BuiltInProfiles
{
    public static Profile Work => new()
    {
        Name = "Рабочий",
        IsBuiltIn = true,
        IsDefault = true,
        CleanupLevel = CleanupLevel.Aggressive,
        ExportFolder = "_inbox",
        AutoTags = ["meeting", "work"],
        SystemPrompt = """
            Ты ассистент для обработки записей рабочих встреч.
            Язык: русский.
            На входе — расшифровка разговора.
            Выкидывай small talk, шутки, болтовню.
            Верни JSON:
            {
              "summary": "краткое изложение (3-5 предложений)",
              "key_points": ["тезис 1", ...],
              "decisions": ["решение 1", ...],
              "action_items": [{"person": "Имя", "task": "Что", "deadline": "Когда"}],
              "unresolved_questions": ["вопрос 1", ...],
              "participants": ["Имя 1", ...],
              "topic": "тема",
              "conversation_type": "meeting",
              "tags": ["tag1", ...]
            }
            """
    };

    public static Profile Personal => new()
    {
        Name = "Неформальный",
        IsBuiltIn = true,
        CleanupLevel = CleanupLevel.Light,
        ExportFolder = "_inbox",
        AutoTags = ["personal"],
        SystemPrompt = """
            Ты ассистент. Обработай запись неформального разговора.
            Сохрани общий смысл, контекст, шутки как шутки.
            НЕ делай сухой протокол.
            Верни JSON: {summary, key_points, participants, topic, conversation_type: "personal", tags}
            """
    };

    public static Profile Full => new()
    {
        Name = "Полная заметка",
        IsBuiltIn = true,
        CleanupLevel = CleanupLevel.None,
        ExportFolder = "_inbox",
        AutoTags = ["full"],
        SystemPrompt = """
            Обработай запись. Сохрани ВСЁ.
            Верни JSON: {summary, key_points, decisions, action_items,
            unresolved_questions, participants, topic, conversation_type, tags}
            """
    };
}
```

---

## 6. Api Layer

### 6.1 Endpoints

```csharp
// Program.cs — Minimal API

// Recordings
app.MapPost("/api/recordings/import", ImportRecordingsEndpoint);      // multipart/form-data
app.MapGet("/api/recordings", GetAllRecordingsEndpoint);
app.MapGet("/api/recordings/{id:guid}", GetRecordingEndpoint);

// Jobs
app.MapPost("/api/jobs", CreateJobEndpoint);                          // {recordingId, profileId}
app.MapGet("/api/jobs", GetJobsEndpoint);
app.MapGet("/api/jobs/stream", StreamJobProgressEndpoint);            // SSE

// Notes
app.MapGet("/api/notes", GetNotesEndpoint);
app.MapGet("/api/notes/{id:guid}", GetNoteEndpoint);
app.MapPost("/api/notes/{id:guid}/reprocess", ReprocessNoteEndpoint); // {profileId}
app.MapPost("/api/notes/{id:guid}/export", ExportNoteEndpoint);

// Profiles
app.MapGet("/api/profiles", GetProfilesEndpoint);
app.MapPost("/api/profiles", CreateProfileEndpoint);
app.MapPut("/api/profiles/{id:guid}", UpdateProfileEndpoint);

// Settings
app.MapGet("/api/settings", GetSettingsEndpoint);
app.MapPut("/api/settings", UpdateSettingsEndpoint);

// Health
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/api/health/llm", CheckLlmHealthEndpoint);
```

### 6.2 SSE для прогресса

```csharp
app.MapGet("/api/jobs/stream", async (IJobProgressNotifier notifier, CancellationToken ct) =>
{
    return Results.Stream(async stream =>
    {
        await foreach (var job in notifier.SubscribeAsync(ct))
        {
            var json = JsonSerializer.Serialize(new {
                job.Id, job.RecordingId, job.Status,
                job.Progress, job.CurrentStep, job.ErrorMessage
            });
            await stream.WriteAsync(Encoding.UTF8.GetBytes($"data: {json}\n\n"), ct);
            await stream.FlushAsync(ct);
        }
    }, "text/event-stream");
});
```

### 6.3 DI Registration

```csharp
// Program.cs
builder.Services.AddSingleton<IAppSettings, SqliteAppSettings>();
builder.Services.AddSingleton<ITranscriptionService, WhisperNetTranscriptionService>();
builder.Services.AddSingleton<ILlmService, OpenAiCompatibleLlmService>();
builder.Services.AddSingleton<IAudioConverter, FfmpegAudioConverter>();
builder.Services.AddSingleton<IMarkdownExporter, FileMarkdownExporter>();
builder.Services.AddSingleton<IJobProgressNotifier, ChannelJobProgressNotifier>();

builder.Services.AddScoped<IRecordingRepository, SqliteRecordingRepository>();
builder.Services.AddScoped<ITranscriptRepository, SqliteTranscriptRepository>();
builder.Services.AddScoped<IProcessedNoteRepository, SqliteProcessedNoteRepository>();
builder.Services.AddScoped<IProfileRepository, SqliteProfileRepository>();
builder.Services.AddScoped<IProcessingJobRepository, SqliteProcessingJobRepository>();

builder.Services.AddScoped<ImportRecordingUseCase>();
builder.Services.AddScoped<ReprocessUseCase>();
builder.Services.AddHostedService<QueueBackgroundService>(); // wraps ProcessQueueWorker
```

---

## 7. Testing Strategy

### Unit Tests (xUnit + NSubstitute)
- **Domain:** FillerCleaner, HashCalculator, AudioFormatDetector, MarkdownGenerator
- **Application:** ImportRecordingUseCase, ProcessQueueWorker, ReprocessUseCase — с mocked repositories и services
- **Naming:** `MethodName_Scenario_ExpectedResult`

### Integration Tests
- **SQLite:** repositories с in-memory SQLite
- **Whisper.net:** smoke test с коротким аудио (fixtures)
- **LLM:** mock HTTP server (WireMock)

### Не тестируем в unit tests
- Electron/React (отдельно)
- ffmpeg subprocess (integration only)
- Реальный LM Studio (manual)

---

## 8. Code Style

- **Nullable reference types:** enable, warnings as errors
- **Naming:** PascalCase для публичных, _camelCase для приватных полей
- **Records:** для value objects и DTOs
- **Primary constructors:** для DI (как в .NET 9)
- **Async:** всё async, CancellationToken везде
- **No exceptions for flow control:** Result<T> или nullable returns
- **Minimal API:** не controllers, endpoints как static methods или lambdas
- **Dapper:** для SQLite queries (не EF Core — overhead для desktop app)
- **JSON:** System.Text.Json (не Newtonsoft)
- **Logging:** ILogger<T>, structured logging

---

## 9. Whisper Parameters (verified, from prototype)

```
Model:            ggml-large-v3-q8_0.bin
Language:         ru
Beam size:        5
Best of:          5
Max context:      0 (каждый 30-сек сегмент независимо — против галлюцинаций)
Suppress NST:     true
Threads:          14 (Apple Silicon M3/M4)
VAD:              Silero v6.2.0
Initial prompt:   "Мысли вслух, встречи, диалоги, рассуждения."
```

---

## 10. Key Architectural Decisions

1. **Whisper.net, не subprocess** — NuGet, тестируемый, CoreML из коробки
2. **OpenAI SDK → LM Studio** — стандартный API, работает с любым OpenAI-compatible endpoint
3. **SQLite + Dapper** — один файл, лёгкий, portable (не EF Core)
4. **Channel<T> для очереди** — in-memory, быстрый, persistent state в SQLite (crash recovery)
5. **SSE для прогресса** — Server-Sent Events, нативно поддерживается React (EventSource)
6. **Profiles — first-class** — вся обработка параметризована Profile, разные выходы из одного source
7. **Idempotent import** — sha256 дедупликация, повторный импорт того же файла = noop
8. **Graceful degradation** — если LLM не запущен, даём raw transcript без summary
