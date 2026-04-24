using System;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface IAudioMetadataProbe
{
    Task<TimeSpan> GetDurationAsync(string filePath, CancellationToken ct);
}
