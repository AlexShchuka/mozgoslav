using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Application.UseCases;

/// <summary>
/// Consumes one <see cref="ProcessingJob"/> from the queue and runs it through the
/// transcription → correction → summarization → export pipeline. Catches all
/// exceptions and marks the job as <see cref="JobStatus.Failed"/> on error so that
/// a single bad file never stalls the queue.
/// </summary>
public sealed class ProcessQueueWorker
{
    private const int TranscribeEnd = 50;
    private const int CorrectionEnd = 60;
    // Plan v0.8 Block 5 — LLM correction stage sits between filler cleanup
    // (60) and summarisation (85). Progress weighting matches the plan.
    private const int LlmCorrectionEnd = 70;
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
    private readonly GlossaryApplicator _glossary;
    private readonly LlmCorrectionService _llmCorrection;
    private readonly IAppSettings _settings;
    private readonly IJobProgressNotifier _progressNotifier;
    private readonly IJobCancellationRegistry _cancellationRegistry;
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
        GlossaryApplicator glossary,
        LlmCorrectionService llmCorrection,
        IAppSettings settings,
        IJobProgressNotifier progressNotifier,
        IJobCancellationRegistry cancellationRegistry,
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
        _glossary = glossary;
        _llmCorrection = llmCorrection;
        _settings = settings;
        _progressNotifier = progressNotifier;
        _cancellationRegistry = cancellationRegistry;
        _logger = logger;
    }

    public async Task<bool> ProcessNextAsync(CancellationToken stoppingToken)
    {
        var job = await _jobs.DequeueNextAsync(stoppingToken);
        if (job is null)
        {
            return false;
        }

        // ADR-015 — register a per-job linked CTS so the cancel endpoint can
        // signal cooperative cancellation on the active pipeline stage. The
        // pipeline runs against `perJobToken`; `stoppingToken` is kept
        // separately so the `when` filter below can distinguish a host-stopping
        // OCE (re-thrown) from a user-cancel OCE (mark Cancelled).
        var perJobCts = _cancellationRegistry.Register(job.Id, stoppingToken);
        var perJobToken = perJobCts.Token;

        try
        {
            if (job.CancelRequested)
            {
                // Cancel was requested while the job was still Queued — skip
                // the pipeline entirely and go straight to the terminal state.
                await MarkCancelledAsync(job);
                return true;
            }

            await ProcessJobAsync(job, perJobToken);
        }
        catch (OperationCanceledException) when (!stoppingToken.IsCancellationRequested)
        {
            // Cooperative cancel — host is still running, only the per-job
            // token was cancelled. Transition to the Cancelled terminal state
            // using CancellationToken.None so the repo/notifier writes survive.
            _logger.LogInformation("Processing job {JobId} cancelled by user", job.Id);
            await MarkCancelledAsync(job);
        }
        catch (OperationCanceledException)
        {
            // Host is shutting down — propagate upward so the loop can exit.
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Processing job {JobId} failed", job.Id);
            await MarkFailedAsync(job, ex.Message, stoppingToken);
        }
        finally
        {
            _cancellationRegistry.Unregister(job.Id);
        }

        return true;
    }

    private async Task ProcessJobAsync(ProcessingJob job, CancellationToken ct)
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
        // Plan v0.8 Block 5 — glossary drives Whisper `initial_prompt`. Empty
        // glossary → null → existing behaviour (no prompt override).
        var whisperInitialPrompt = _glossary.TryBuildInitialPrompt(profile);
        var segments = await _transcriptionService.TranscribeAsync(
            wavPath, _settings.Language, whisperInitialPrompt, segmentProgress, ct);

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

        // Plan v0.8 Block 5 — optional LLM correction pass. When the profile
        // opts in and the LLM is reachable, rewrite the transcript to fix
        // homophones / proper-noun spellings / punctuation. On any failure
        // the service returns the raw text, so the pipeline never stalls.
        if (profile.LlmCorrectionEnabled && await _llmService.IsAvailableAsync(ct))
        {
            await TransitionAsync(job, JobStatus.Correcting, LlmCorrectionEnd, "LLM correction", ct);
            cleanText = await _llmCorrection.CorrectAsync(cleanText, profile, ct);
        }

        await TransitionAsync(job, JobStatus.Summarizing, LlmCorrectionEnd, "Summarizing via LLM", ct);
        LlmProcessingResult? llmResult = null;
        if (await _llmService.IsAvailableAsync(ct))
        {
            var summarisationSystemPrompt = ComposeSummarisationPrompt(profile);
            llmResult = await _llmService.ProcessAsync(cleanText, summarisationSystemPrompt, ct);
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

    /// <summary>
    /// ADR-015 — terminal transition for user-initiated cancellation. Uses
    /// <see cref="CancellationToken.None"/> so the persistence + SSE publish
    /// complete even though the per-job token is already in the cancelled state.
    /// </summary>
    private async Task MarkCancelledAsync(ProcessingJob job)
    {
        job.Status = JobStatus.Cancelled;
        job.FinishedAt = DateTime.UtcNow;
        await _jobs.UpdateAsync(job, CancellationToken.None);
        await _progressNotifier.PublishAsync(job, CancellationToken.None);
    }

    private static int ScaleProgress(int inputPercent, int rangeStart, int rangeEnd)
    {
        var clamped = Math.Clamp(inputPercent, 0, 100);
        return rangeStart + (int)((rangeEnd - rangeStart) * (clamped / 100.0));
    }

    private string ComposeSummarisationPrompt(Profile profile)
    {
        var suffix = _glossary.TryBuildLlmSystemPromptSuffix(profile);
        return string.IsNullOrWhiteSpace(suffix)
            ? profile.SystemPrompt
            : profile.SystemPrompt + "\n\n" + suffix;
    }
}
