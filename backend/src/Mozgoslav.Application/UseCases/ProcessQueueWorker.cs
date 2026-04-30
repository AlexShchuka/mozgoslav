using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Application.UseCases;

public sealed class ProcessQueueWorker
{
    private const int TranscribeEnd = 50;
    private const int CorrectionEnd = 60;
    private const int LlmCorrectionEnd = 70;
    private const int SummarizeEnd = 85;
    private const int ExportEnd = 100;

    private readonly IProcessingJobRepository _jobs;
    private readonly IProcessingJobStageRepository _stages;
    private readonly IRecordingRepository _recordings;
    private readonly ITranscriptRepository _transcripts;
    private readonly IProcessedNoteRepository _notes;
    private readonly IProfileRepository _profiles;
    private readonly IAudioConverter _audioConverter;
    private readonly ITranscriptionService _transcriptionService;
    private readonly ILlmService _llmService;
    private readonly CorrectionService _correctionService;
    private readonly GlossaryApplicator _glossary;
    private readonly LlmCorrectionService _llmCorrection;
    private readonly IAppSettings _settings;
    private readonly IJobProgressNotifier _progressNotifier;
    private readonly IJobCancellationRegistry _cancellationRegistry;
    private readonly IPythonSidecarClient _sidecarClient;
    private readonly IDomainEventBus _eventBus;
    private readonly ILogger<ProcessQueueWorker> _logger;

    public ProcessQueueWorker(
        IProcessingJobRepository jobs,
        IProcessingJobStageRepository stages,
        IRecordingRepository recordings,
        ITranscriptRepository transcripts,
        IProcessedNoteRepository notes,
        IProfileRepository profiles,
        IAudioConverter audioConverter,
        ITranscriptionService transcriptionService,
        ILlmService llmService,
        CorrectionService correctionService,
        GlossaryApplicator glossary,
        LlmCorrectionService llmCorrection,
        IAppSettings settings,
        IJobProgressNotifier progressNotifier,
        IJobCancellationRegistry cancellationRegistry,
        IPythonSidecarClient sidecarClient,
        IDomainEventBus eventBus,
        ILogger<ProcessQueueWorker> logger)
    {
        _jobs = jobs;
        _stages = stages;
        _recordings = recordings;
        _transcripts = transcripts;
        _notes = notes;
        _profiles = profiles;
        _audioConverter = audioConverter;
        _transcriptionService = transcriptionService;
        _llmService = llmService;
        _correctionService = correctionService;
        _glossary = glossary;
        _llmCorrection = llmCorrection;
        _settings = settings;
        _progressNotifier = progressNotifier;
        _cancellationRegistry = cancellationRegistry;
        _sidecarClient = sidecarClient;
        _eventBus = eventBus;
        _logger = logger;
    }

    public async Task ProcessJobAsync(Guid jobId, CancellationToken ct)
    {
        var job = await _jobs.GetByIdAsync(jobId, ct);
        if (job is null)
        {
            _logger.LogWarning("Quartz trigger fired for unknown job {JobId} — skipping", jobId);
            return;
        }
        if (job.Status is JobStatus.Done or JobStatus.Failed or JobStatus.Cancelled)
        {
            _logger.LogInformation("Quartz trigger fired for already-terminal job {JobId} — skipping", jobId);
            return;
        }

        var perJobToken = _cancellationRegistry.Register(job.Id, ct).Token;

        try
        {
            if (job.CancelRequested)
            {
                await MarkCancelledAsync(job);
                return;
            }

            await RunPipelineAsync(job, perJobToken);
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            _logger.LogInformation("Processing job {JobId} cancelled by user", job.Id);
            await MarkCancelledAsync(job);
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
        finally
        {
            _cancellationRegistry.Unregister(job.Id);
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

        var segmentProgress = new Progress<int>(p => _ = NotifyProgressAsync(job, ScaleProgress(p, 0, TranscribeEnd), ct));
        var whisperInitialPrompt = _glossary.TryBuildInitialPrompt(profile, _settings.Language);
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

        if (profile.LlmCorrectionEnabled && await _llmService.IsAvailableAsync(ct))
        {
            await TransitionAsync(job, JobStatus.Correcting, LlmCorrectionEnd, "LLM correction", ct);
            cleanText = await _llmCorrection.CorrectAsync(cleanText, profile, ct, _settings.Language);
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
        note.MarkdownContent = MarkdownGenerator.Generate(note, profile, recording, transcript.Segments);

        await TransitionAsync(job, JobStatus.Exporting, SummarizeEnd, "Exporting to vault", ct);
        note.ExportedToVault = false;
        note.VaultPath = null;
        await _notes.AddAsync(note, ct);
        await _eventBus.PublishAsync(new ProcessedNoteSaved(note.Id, profile.Id, DateTimeOffset.UtcNow), ct);

        recording.Status = RecordingStatus.Transcribed;
        if (segments.Count > 0)
        {
            recording.Duration = segments[^1].End;
        }
        await _recordings.UpdateAsync(recording, ct);

        if (_settings.SidecarEnrichmentEnabled)
        {
            try
            {
                var enrichment = await _sidecarClient.ProcessAllAsync(wavPath, steps: null, ct);
                _logger.LogInformation(
                    "Sidecar enrichment completed for job {JobId}: cleanedText={Len}ch embedding={Dim}d",
                    job.Id, enrichment.CleanedText.Length, enrichment.Embedding.Count);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Sidecar enrichment failed for job {JobId} — skipping", job.Id);
            }
        }

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

    private ProcessingJobStage? _currentStage;

    private async Task TransitionAsync(ProcessingJob job, JobStatus status, int progress, string? step, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;

        if (_currentStage is not null)
        {
            _currentStage.FinishedAt = now;
            _currentStage.DurationMs = (int)(now - _currentStage.StartedAt).TotalMilliseconds;
            await _stages.UpdateAsync(_currentStage, ct);
        }

        job.Status = status;
        job.Progress = progress;
        job.CurrentStep = step;
        await _jobs.UpdateAsync(job, ct);
        await _progressNotifier.PublishAsync(job, ct);

        if (!string.IsNullOrWhiteSpace(step))
        {
            _currentStage = new ProcessingJobStage
            {
                JobId = job.Id,
                StageName = step,
                StartedAt = now
            };
            await _stages.AddAsync(_currentStage, ct);
        }
        else
        {
            _currentStage = null;
        }
    }

    private async Task NotifyProgressAsync(ProcessingJob job, int progress, CancellationToken ct)
    {
        job.Progress = progress;
        await _progressNotifier.PublishAsync(job, ct);
    }

    private async Task MarkFailedAsync(ProcessingJob job, string error, CancellationToken ct)
    {
        if (_currentStage is not null)
        {
            var now = DateTimeOffset.UtcNow;
            _currentStage.FinishedAt = now;
            _currentStage.DurationMs = (int)(now - _currentStage.StartedAt).TotalMilliseconds;
            _currentStage.ErrorMessage = error;
            await _stages.UpdateAsync(_currentStage, ct);
            _currentStage = null;
        }

        job.Status = JobStatus.Failed;
        job.ErrorMessage = error;
        job.FinishedAt = DateTime.UtcNow;
        await _jobs.UpdateAsync(job, ct);
        await _progressNotifier.PublishAsync(job, ct);
    }

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
