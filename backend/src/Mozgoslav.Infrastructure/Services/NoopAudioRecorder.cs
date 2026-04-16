using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Portable no-op audio recorder. Declares <see cref="IsSupported"/>=<c>false</c>
/// so the UI can hide or disable the record button outside macOS. A real macOS
/// implementation (AVFoundation bridge) ships in a future iteration and replaces
/// this registration.
/// </summary>
public sealed class NoopAudioRecorder : IAudioRecorder
{
    public bool IsSupported => false;
    public bool IsRecording => false;
    public TimeSpan CurrentDuration => TimeSpan.Zero;

    public Task StartAsync(string outputPath, CancellationToken ct) =>
        throw new PlatformNotSupportedException(
            "Audio recording requires the native macOS capture backend; not available on this platform.");

    public Task<string> StopAsync(CancellationToken ct) =>
        throw new PlatformNotSupportedException(
            "Audio recording requires the native macOS capture backend; not available on this platform.");
}
