using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Integration.AudioRecorder;

/// <summary>
/// Verifies the non-macOS fallback recorder honestly gates the feature per
/// ADR-009 §2.1 row 1. The UI uses <c>IsSupported=false</c> to hide the
/// Record button; explicit calls to <c>StartAsync</c> throw a typed
/// <c>PlatformNotSupportedException</c>.
/// </summary>
[TestClass]
public sealed class PlatformUnsupportedAudioRecorderTests
{
    [TestMethod]
    public void IsSupported_AlwaysFalse()
    {
        var recorder = new PlatformUnsupportedAudioRecorder();
        recorder.IsSupported.Should().BeFalse();
        recorder.IsRecording.Should().BeFalse();
        recorder.CurrentDuration.Should().Be(TimeSpan.Zero);
    }

    [TestMethod]
    public async Task StartAsync_ThrowsPlatformNotSupported()
    {
        var recorder = new PlatformUnsupportedAudioRecorder();
        var act = () => recorder.StartAsync("/tmp/x.wav", CancellationToken.None);
        await act.Should().ThrowAsync<PlatformNotSupportedException>();
    }

    [TestMethod]
    public async Task StopAsync_ThrowsPlatformNotSupported()
    {
        var recorder = new PlatformUnsupportedAudioRecorder();
        var act = () => recorder.StopAsync(CancellationToken.None);
        await act.Should().ThrowAsync<PlatformNotSupportedException>();
    }
}
