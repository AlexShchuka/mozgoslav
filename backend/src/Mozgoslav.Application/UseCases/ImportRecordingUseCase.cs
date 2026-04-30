using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.Services;

namespace Mozgoslav.Application.UseCases;

public sealed class ImportRecordingUseCase
{
    private readonly IRecordingRepository _recordings;
    private readonly IProfileRepository _profiles;
    private readonly IAudioMetadataProbe? _metadataProbe;
    private readonly RecordingFinaliser _finaliser;
    private readonly ILogger<ImportRecordingUseCase> _logger;

    public ImportRecordingUseCase(
        IRecordingRepository recordings,
        RecordingFinaliser finaliser,
        IProfileRepository profiles,
        IAudioMetadataProbe? metadataProbe,
        ILogger<ImportRecordingUseCase> logger)
    {
        _recordings = recordings;
        _finaliser = finaliser;
        _profiles = profiles;
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

            var metadata = await _finaliser.ResolveMetadataAsync(path, _metadataProbe, ct);

            var recording = new Recording
            {
                FileName = Path.GetFileName(path),
                FilePath = path,
                Sha256 = metadata.Sha256,
                Format = format,
                SourceType = SourceType.Imported,
                Duration = metadata.Duration
            };

            await _recordings.AddAsync(recording, ct);

            await _finaliser.EnqueueAndScheduleAsync(recording.Id, profile.Id, ct);

            result.Add(recording);
        }

        return result;
    }
}
