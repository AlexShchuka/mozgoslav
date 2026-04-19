using System;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Platform-gated audio recorder for non-macOS hosts. Per ADR-009 §2.1 row 1,
/// <see cref="IsSupported"/> is <c>false</c> so the UI can hide the Record
/// button; attempts to call <see cref="StartAsync"/> throw a typed
/// <see cref="PlatformNotSupportedException"/> with an actionable message.
/// </summary>
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
