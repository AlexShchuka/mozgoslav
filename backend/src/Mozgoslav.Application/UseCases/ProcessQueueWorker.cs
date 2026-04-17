using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Application.UseCases;

/// <summary>
/// Runs a single <see cref="ProcessingJob"/> through the transcription →
/// correction → summarization → export pipeline. Catches all exceptions and
/// marks the job as <see cref="JobStatus.Failed"/> on error so that a single
/// bad file never stalls downstream Quartz triggers.
/// <para>
/// ADR-011 step 6 — this type used to drive the queue loop itself
/// (<c>ProcessNextAsync</c>) by polling <c>IProcessingJobRepository.DequeueNextAsync</c>.
/// The loop has moved into Quartz.NET; this worker now accepts a job id from
/// whichever Quartz <c>IJob</c> trigger fired and processes that one job.
/// </para>
/// </summary>
public sealed class ProcessQueueWorker
{
    private const int TranscribeEnd = 50;
    private const int CorrectionEnd = 60;
    private const int SummarizeEnd = 85;
    private const int ExportEnd = 100;

    private readonly IProcessingJobRepository _jobs;
    private readonly IRecordingRepository _recordings;
    private readonly ITranscriptRepository _transcripts;
    private readonly IProcessedNoteRepository _notes;
    private readonly IProfileRepository _profiles;
    private readonly IAudioConverter _audioConverter;
    private readonly ITranscriptionService _transcriptionService;
    private readonly ILlmService _llmService;
    private readonly IMarkdownExporter _exporter;
    private readonly CorrectionService _correctionService;
    private readonly IAppSettings _settings;
    private readonly IJobProgressNotifier _progressNotifier;
    private readonly ILogger<ProcessQueueWorker> _logger;

    public ProcessQueueWorker(
        IProcessingJobRepository jobs,
        IRecordingRepository recordings,
        ITranscriptRepository transcripts,
        IProcessedNoteRepository notes,
        IProfileRepository profiles,
        IAudioConverter audioConverter,
        ITranscriptionService transcriptionService,
        ILlmService llmService,
        IMarkdownExporter exporter,
        CorrectionService correctionService,
        IAppSettings settings,
        IJobProgressNotifier progressNotifier,
        ILogger<ProcessQueueWorker> logger)
    {
        _jobs = jobs;
        _recordings = recordings;
        _transcripts = transcripts;
        _notes = notes;
        _profiles = profiles;
        _audioConverter = audioConverter;
        _transcriptionService = transcriptionService;
        _llmService = llmService;
        _exporter = exporter;
        _correctionService = correctionService;
        _settings = settings;
        _progressNotifier = progressNotifier;
        _logger = logger;
    }

    /// <summary>
    /// Loads <paramref name="jobId"/> from the repository and runs the full
    /// pipeline against it. Never throws for pipeline-internal failures — the
    /// job row transitions to <see cref="JobStatus.Failed"/> with the error
    /// message. Host-shutdown <see cref="OperationCanceledException"/> DOES
    /// propagate so Quartz can ack the trigger cleanly.
    /// </summary>
    public async Task ProcessJobAsync(Guid jobId, CancellationToken ct)
    {
        var job = await _jobs.GetByIdAsync(jobId, ct);
        if (job is null)
        {
            _logger.LogWarning("Quartz trigger fired for unknown job {JobId} — skipping", jobId);
            return;
        }
        if (job.Status is JobStatus.Done or JobStatus.Failed)
        {
            _logger.LogInformation("Quartz trigger fired for already-terminal job {JobId} — skipping", jobId);
            return;
        }

        try
        {
            await RunPipelineAsync(job, ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Processing job {JobId} failed", job.Id);
            await MarkFailedAsync(job, ex.Message, ct);
        }
    }

    private async Task RunPipelineAsync(ProcessingJob job, CancellationToken ct)
    {
        var recording = await _recordings.GetByIdAsync(job.RecordingId, ct)
            ?? throw new InvalidOperationException($"Recording {job.RecordingId} not found");
        var profile = await _profiles.GetByIdAsync(job.ProfileId, ct)
            ?? throw new InvalidOperationException($"Profile {job.ProfileId} not found");

        await TransitionAsync(job, JobStatus.Transcribing, 0, "Transcribing audio", ct);
        job.StartedAt = DateTime.UtcNow;
        await _jobs.UpdateAsync(job, ct);

        var wavPath = await _audioConverter.ConvertToWavAsync(recording.FilePath, ct);

        var segmentProgress = new Progress<int>(p => _ = UpdateProgressAsync(job, ScaleProgress(p, 0, TranscribeEnd), ct));
        var segments = await _transcriptionService.TranscribeAsync(
            wavPath, _settings.Language, profile.SystemPrompt, segmentProgress, ct);

        var transcript = new Transcript
        {
            RecordingId = recording.Id,
            ModelUsed = string.IsNullOrEmpty(_settings.WhisperModelPath)
                ? "unknown"
                : Path.GetFileName(_settings.WhisperModelPath),
            Language = _settings.Language,
            RawText = string.Join(" ", segments.Select(s => s.Text)).Trim(),
            Segments = segments.ToList()
        };
        await _transcripts.AddAsync(transcript, ct);

        await TransitionAsync(job, JobStatus.Correcting, CorrectionEnd, "Cleaning transcript", ct);
        var cleanText = _correctionService.Correct(transcript.RawText, profile);

        await TransitionAsync(job, JobStatus.Summarizing, CorrectionEnd, "Summarizing via LLM", ct);
        LlmProcessingResult? llmResult = null;
        if (await _llmService.IsAvailableAsync(ct))
        {
            llmResult = await _llmService.ProcessAsync(cleanText, profile.SystemPrompt, ct);
        }
        else
        {
            _logger.LogWarning("LLM endpoint unavailable — skipping summarization for job {JobId}", job.Id);
        }

        var existingNotes = await _notes.GetByTranscriptIdAsync(transcript.Id, ct);
        var version = existingNotes.Count == 0 ? 1 : existingNotes.Max(n => n.Version) + 1;

        var note = BuildNote(transcript, profile, recording, cleanText, llmResult, version);
        note.MarkdownContent = MarkdownGenerator.Generate(note, profile, recording);

        await TransitionAsync(job, JobStatus.Exporting, SummarizeEnd, "Exporting to vault", ct);
        if (!string.IsNullOrWhiteSpace(_settings.VaultPath))
        {
            try
            {
                note.VaultPath = await _exporter.ExportAsync(note, profile, _settings.VaultPath, ct);
                note.ExportedToVault = true;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Markdown export failed for job {JobId}", job.Id);
            }
        }

        await _notes.AddAsync(note, ct);

        recording.Status = RecordingStatus.Transcribed;
        if (segments.Count > 0)
        {
            recording.Duration = segments[^1].End;
        }
        await _recordings.UpdateAsync(recording, ct);

        await TransitionAsync(job, JobStatus.Done, ExportEnd, null, ct);
        job.FinishedAt = DateTime.UtcNow;
        await _jobs.UpdateAsync(job, ct);
        await _progressNotifier.PublishAsync(job, ct);
    }

    private static ProcessedNote BuildNote(
        Transcript transcript,
        Profile profile,
        Recording recording,
        string cleanText,
        LlmProcessingResult? llm,
        int version) => new()
        {
            TranscriptId = transcript.Id,
            ProfileId = profile.Id,
            Version = version,
            Summary = llm?.Summary ?? string.Empty,
            KeyPoints = llm?.KeyPoints.ToList() ?? [],
            Decisions = llm?.Decisions.ToList() ?? [],
            ActionItems = llm?.ActionItems.ToList() ?? [],
            UnresolvedQuestions = llm?.UnresolvedQuestions.ToList() ?? [],
            Participants = llm?.Participants.ToList() ?? [],
            Topic = llm?.Topic ?? Path.GetFileNameWithoutExtension(recording.FileName),
            ConversationType = llm?.ConversationType ?? ConversationType.Other,
            CleanTranscript = cleanText,
            FullTranscript = transcript.RawText,
            Tags = llm?.Tags.ToList() ?? []
        };

    private async Task TransitionAsync(ProcessingJob job, JobStatus status, int progress, string? step, CancellationToken ct)
    {
        job.Status = status;
        job.Progress = progress;
        job.CurrentStep = step;
        await _jobs.UpdateAsync(job, ct);
        await _progressNotifier.PublishAsync(job, ct);
    }

    private async Task UpdateProgressAsync(ProcessingJob job, int progress, CancellationToken ct)
    {
        job.Progress = progress;
        await _jobs.UpdateAsync(job, ct);
        await _progressNotifier.PublishAsync(job, ct);
    }

    private async Task MarkFailedAsync(ProcessingJob job, string error, CancellationToken ct)
    {
        job.Status = JobStatus.Failed;
        job.ErrorMessage = error;
        job.FinishedAt = DateTime.UtcNow;
        await _jobs.UpdateAsync(job, ct);
        await _progressNotifier.PublishAsync(job, ct);
    }

    private static int ScaleProgress(int inputPercent, int rangeStart, int rangeEnd)
    {
        var clamped = Math.Clamp(inputPercent, 0, 100);
        return rangeStart + (int)((rangeEnd - rangeStart) * (clamped / 100.0));
    }
}
