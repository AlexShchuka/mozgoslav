using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Infrastructure;

[TestClass]
public sealed class FfprobeAudioMetadataProbeTests
{
    [TestMethod]
    public async Task GetDurationAsync_returns_real_duration_for_2s_wav()
    {
        if (!FfprobeOnPath())
        {
            Assert.Inconclusive("ffprobe not on PATH — skipping.");
        }

        var probe = new FfprobeAudioMetadataProbe(
            NullLogger<FfprobeAudioMetadataProbe>.Instance);
        var fixturePath = Path.Combine(
            AppContext.BaseDirectory, "Fixtures", "probe-2s.wav");

        var duration = await probe.GetDurationAsync(fixturePath, CancellationToken.None);

        duration.TotalSeconds.Should().BeApproximately(2.0, 0.05,
            "ffprobe should resolve the sine fixture to exactly 2 seconds");
    }

    [TestMethod]
    public async Task GetDurationAsync_returns_zero_for_missing_file()
    {
        var probe = new FfprobeAudioMetadataProbe(
            NullLogger<FfprobeAudioMetadataProbe>.Instance);

        var duration = await probe.GetDurationAsync("/path/does/not/exist.wav", CancellationToken.None);

        duration.Should().Be(TimeSpan.Zero);
    }

    [TestMethod]
    public async Task GetDurationAsync_returns_zero_when_ffprobe_cannot_parse_input()
    {
        if (!FfprobeOnPath())
        {
            Assert.Inconclusive("ffprobe not on PATH — skipping.");
        }

        var probe = new FfprobeAudioMetadataProbe(
            NullLogger<FfprobeAudioMetadataProbe>.Instance);
        var garbage = Path.Combine(Path.GetTempPath(), "mozgoslav-garbage-" + Guid.NewGuid().ToString("N") + ".wav");
        await File.WriteAllTextAsync(garbage, "not a wav at all");
        try
        {
            var duration = await probe.GetDurationAsync(garbage, CancellationToken.None);
            duration.Should().Be(TimeSpan.Zero);
        }
        finally
        {
            File.Delete(garbage);
        }
    }

    private static bool FfprobeOnPath()
    {
        var pathEnv = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        var separator = OperatingSystem.IsWindows() ? ';' : ':';
        foreach (var dir in pathEnv.Split(separator, StringSplitOptions.RemoveEmptyEntries))
        {
            var candidate = Path.Combine(dir, OperatingSystem.IsWindows() ? "ffprobe.exe" : "ffprobe");
            if (File.Exists(candidate))
            {
                return true;
            }
        }
        return false;
    }
}
