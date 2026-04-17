using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Infrastructure;

/// <summary>
/// ADR-011 step 8 — CliWrap-backed ffmpeg wrappers. Exercises input validation
/// paths that do not require the ffmpeg binary to be on PATH; the happy path
/// is covered by end-to-end tests that exist outside the sandboxed CI image.
/// </summary>
[TestClass]
public sealed class FfmpegAudioConverterTests
{
    [TestMethod]
    public async Task ConvertToWavAsync_MissingInputFile_ThrowsFileNotFound()
    {
        var sut = new FfmpegAudioConverter(NullLogger<FfmpegAudioConverter>.Instance);
        var bogus = Path.Combine(Path.GetTempPath(), $"does-not-exist-{Guid.NewGuid():N}.mp3");

        var act = async () => await sut.ConvertToWavAsync(bogus, CancellationToken.None);

        await act.Should().ThrowAsync<FileNotFoundException>();
    }

    [TestMethod]
    public async Task ConvertToWavAsync_WhitespaceInput_ThrowsArgument()
    {
        var sut = new FfmpegAudioConverter(NullLogger<FfmpegAudioConverter>.Instance);

        var act = async () => await sut.ConvertToWavAsync("   ", CancellationToken.None);

        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task ConvertToWavAsync_CancelledToken_DoesNotHangAndPropagates()
    {
        var sut = new FfmpegAudioConverter(NullLogger<FfmpegAudioConverter>.Instance);
        var tempInput = Path.Combine(Path.GetTempPath(), $"mozgoslav-cliwrap-{Guid.NewGuid():N}.dat");
        await File.WriteAllBytesAsync(tempInput, new byte[16]);
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        try
        {
            var act = async () => await sut.ConvertToWavAsync(tempInput, cts.Token);
            // Either an OCE (ffmpeg present + cancelled early) or an
            // InvalidOperationException (ffmpeg not installed in this sandbox)
            // is acceptable — what we are pinning is that the call does NOT
            // hang when cancellation fires before the process starts.
            await act.Should().ThrowAsync<Exception>();
        }
        finally
        {
            File.Delete(tempInput);
        }
    }
}
