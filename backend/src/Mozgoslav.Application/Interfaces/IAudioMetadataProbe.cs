using System;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Probes an on-disk audio file for its metadata. Today we only need the
/// total duration — called from <c>ImportRecordingUseCase</c> so the UI can
/// show the real length immediately instead of waiting for transcription
/// to finish and back-fill it from the last segment.
/// </summary>
public interface IAudioMetadataProbe
{
    /// <summary>
    /// Returns <see cref="TimeSpan.Zero"/> when the file is missing or the
    /// probe binary can't parse it — callers treat a zero duration as
    /// "unknown yet" and render the pending placeholder.
    /// </summary>
    Task<TimeSpan> GetDurationAsync(string filePath, CancellationToken ct);
}
