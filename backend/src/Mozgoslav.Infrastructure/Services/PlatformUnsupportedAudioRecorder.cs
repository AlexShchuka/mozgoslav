using System;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

public sealed class PlatformUnsupportedAudioRecorder : IAudioRecorder
{
    public bool IsSupported => false;

    public bool IsRecording => false;

    public TimeSpan CurrentDuration => TimeSpan.Zero;

    public Task StartAsync(string outputPath, CancellationToken ct) =>
        throw new PlatformNotSupportedException(
            "Audio recording requires macOS (AVFoundation). " +
            "The Mozgoslav backend detects the platform at startup and falls back " +
            "to import-only mode on Linux/Windows.");

    public Task<string> StopAsync(CancellationToken ct) =>
        throw new PlatformNotSupportedException(
            "Audio recording requires macOS. No active session on this platform.");
}
