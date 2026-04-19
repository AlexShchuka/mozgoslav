using System;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Captures audio from the system microphone into a file. macOS-only today —
/// the Linux/Windows builds ship a stub that throws to keep the backend portable.
/// </summary>
public interface IAudioRecorder
{
    bool IsSupported { get; }
    bool IsRecording { get; }
    TimeSpan CurrentDuration { get; }

    Task StartAsync(string outputPath, CancellationToken ct);
    Task<string> StopAsync(CancellationToken ct);
}
