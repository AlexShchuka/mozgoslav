using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Application.UseCases;

/// <summary>
/// Imports one or more audio files as Recordings and enqueues a ProcessingJob for each.
/// Every call creates a fresh Recording row — duplicate imports of the same
/// audio content produce distinct timeline entries (product decision
/// 2026-04-19, meeting note). SHA-256 remains on the row for reference and
/// future vault-level dedup; it is no longer unique at the DB level.
/// </summary>
public sealed class ImportRecordingUseCase
{
    private readonly IRecordingRepository _recordings;
    private readonly IProcessingJobRepository _jobs;
    private readonly IProfileRepository _profiles;
    private readonly IProcessingJobScheduler _scheduler;
    private readonly IAudioMetadataProbe? _metadataProbe;
    private readonly ILogger<ImportRecordingUseCase> _logger;

    public ImportRecordingUseCase(
        IRecordingRepository recordings,
        IProcessingJobRepository jobs,
        IProfileRepository profiles,
        IProcessingJobScheduler scheduler)
        : this(recordings, jobs, profiles, scheduler, metadataProbe: null, NullLogger<ImportRecordingUseCase>.Instance)
    {
    }

    public ImportRecordingUseCase(
        IRecordingRepository recordings,
        IProcessingJobRepository jobs,
        IProfileRepository profiles,
        IProcessingJobScheduler scheduler,
        ILogger<ImportRecordingUseCase> logger)
        : this(recordings, jobs, profiles, scheduler, metadataProbe: null, logger)
    {
    }

    public ImportRecordingUseCase(
        IRecordingRepository recordings,
        IProcessingJobRepository jobs,
        IProfileRepository profiles,
        IProcessingJobScheduler scheduler,
        IAudioMetadataProbe? metadataProbe,
        ILogger<ImportRecordingUseCase> logger)
    {
        _recordings = recordings;
        _jobs = jobs;
        _profiles = profiles;
        _scheduler = scheduler;
        _metadataProbe = metadataProbe;
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

            var duration = _metadataProbe is not null
                ? await _metadataProbe.GetDurationAsync(path, ct)
                : TimeSpan.Zero;

            var recording = new Recording
            {
                FileName = Path.GetFileName(path),
                FilePath = path,
                Sha256 = sha256,
                Format = format,
                SourceType = SourceType.Imported,
                Duration = duration
            };

            await _recordings.AddAsync(recording, ct);

            var processingJob = await _jobs.EnqueueAsync(
                new ProcessingJob
                {
                    RecordingId = recording.Id,
                    ProfileId = profile.Id
                },
                ct);
            await _scheduler.ScheduleAsync(processingJob.Id, ct);

            result.Add(recording);
        }

        return result;
    }
}
