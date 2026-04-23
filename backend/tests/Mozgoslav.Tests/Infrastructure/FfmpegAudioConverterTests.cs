using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Infrastructure;

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
            await act.Should().ThrowAsync<Exception>();
        }
        finally
        {
            File.Delete(tempInput);
        }
    }
}
