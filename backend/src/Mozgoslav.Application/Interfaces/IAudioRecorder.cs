using System;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface IAudioRecorder
{
    bool IsSupported { get; }
    bool IsRecording { get; }
    TimeSpan CurrentDuration { get; }

    Task StartAsync(string outputPath, Guid? streamSessionId, CancellationToken ct);
    Task<string> StopAsync(CancellationToken ct);
}
