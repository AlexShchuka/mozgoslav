using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Application.UseCases;

/// <summary>
/// Imports one or more audio files as Recordings and enqueues a ProcessingJob for each.
/// Import is idempotent by SHA-256: re-importing the same content is a no-op.
/// </summary>
public sealed class ImportRecordingUseCase
{
    private readonly IRecordingRepository _recordings;
    private readonly IProcessingJobRepository _jobs;
    private readonly IProfileRepository _profiles;
    private readonly IProcessingJobScheduler _scheduler;
    private readonly ILogger<ImportRecordingUseCase> _logger;

    public ImportRecordingUseCase(
        IRecordingRepository recordings,
        IProcessingJobRepository jobs,
        IProfileRepository profiles,
        IProcessingJobScheduler scheduler)
        : this(recordings, jobs, profiles, scheduler, NullLogger<ImportRecordingUseCase>.Instance)
    {
    }

    public ImportRecordingUseCase(
        IRecordingRepository recordings,
        IProcessingJobRepository jobs,
        IProfileRepository profiles,
        IProcessingJobScheduler scheduler,
        ILogger<ImportRecordingUseCase> logger)
    {
        _recordings = recordings;
        _jobs = jobs;
        _profiles = profiles;
        _scheduler = scheduler;
        _logger = logger;
    }

    public async Task<IReadOnlyList<Recording>> ExecuteAsync(
        IReadOnlyList<string> filePaths,
        Guid? profileId,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(filePaths);

        if (filePaths.Count == 0)
        {
            return Array.Empty<Recording>();
        }

        var profile = profileId.HasValue
            ? await _profiles.GetByIdAsync(profileId.Value, ct)
                ?? throw new InvalidOperationException($"Profile {profileId.Value} not found")
            : await _profiles.TryGetDefaultAsync(ct)
                ?? throw new InvalidOperationException("No default profile configured");

        var result = new List<Recording>(filePaths.Count);

        foreach (var path in filePaths)
        {
            if (!File.Exists(path))
            {
                throw new FileNotFoundException($"Audio file not found: {path}", path);
            }

            // D1 handoff log: every inbound path + size, so the operator can
            // correlate missing-recording bugs end-to-end.
            long size = -1;
            try
            {
                size = new FileInfo(path).Length;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                _logger.LogWarning(ex, "D1 handoff: cannot stat {Path}", path);
            }
            if (size <= 0)
            {
                _logger.LogWarning(
                    "D1 handoff: import saw empty/missing audio file (path={Path}, size={Size}b) — skipping Recording creation",
                    path, size);
                continue;
            }
            _logger.LogInformation(
                "D1 handoff: ImportRecordingUseCase path={Path} size={Size}b",
                path, size);

            var extension = Path.GetExtension(path);
            if (!AudioFormatDetector.TryFromExtension(extension, out var format))
            {
                throw new InvalidOperationException($"Unsupported audio format for file: {path}");
            }

            var sha256 = await HashCalculator.Sha256Async(path, ct);

            var existing = await _recordings.GetBySha256Async(sha256, ct);
            if (existing is not null)
            {
                result.Add(existing);
                continue;
            }

            var recording = new Recording
            {
                FileName = Path.GetFileName(path),
                FilePath = path,
                Sha256 = sha256,
                Format = format,
                SourceType = SourceType.Imported
            };

            await _recordings.AddAsync(recording, ct);

            var processingJob = await _jobs.EnqueueAsync(
                new ProcessingJob
                {
                    RecordingId = recording.Id,
                    ProfileId = profile.Id
                },
                ct);
            // ADR-011 step 6 — hand the job to Quartz. The processing_jobs row
            // remains the durable UI-facing state; Quartz owns the run cadence.
            await _scheduler.ScheduleAsync(processingJob.Id, ct);

            result.Add(recording);
        }

        return result;
    }
}
