using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Integration.AudioRecorder;

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
