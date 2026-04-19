using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Infrastructure;

/// <summary>
/// D4 — per-session long-running ffmpeg decoder. Exercises the write/stop
/// lifecycle against a real 3-second WebM/Opus sample split into header-less
/// continuation chunks (the exact MediaRecorder failure mode). Requires
/// ffmpeg on PATH; tests are skipped on the rare sandbox that is missing it.
/// </summary>
[TestClass]
public sealed class FfmpegPcmStreamServiceTests
{
    private static readonly string FixtureDirectory = LocateFixtureDirectory();

    [TestMethod]
    public async Task StartWriteStop_WithChunkedWebm_ProducesPcmAndExitsCleanly()
    {
        if (!HasFfmpeg()) Assert.Inconclusive("ffmpeg not installed in this sandbox");

        await using var service = new FfmpegPcmStreamService(NullLogger<FfmpegPcmStreamService>.Instance);
        var sessionId = Guid.NewGuid();

        await service.StartAsync(sessionId, CancellationToken.None);
        var reader = service.GetReader(sessionId);

        var drainTask = Task.Run(async () =>
        {
            var total = 0;
            await foreach (var samples in reader.ReadAllAsync())
            {
                total += samples.Length;
            }
            return total;
        });

        foreach (var chunkPath in Directory.EnumerateFiles(FixtureDirectory, "chunk-*.bin")
            .OrderBy(p => p, StringComparer.Ordinal))
        {
            var bytes = await File.ReadAllBytesAsync(chunkPath);
            await service.WriteAsync(sessionId, bytes, CancellationToken.None);
        }

        var remaining = await service.StopAsync(sessionId, CancellationToken.None);
        var drained = await drainTask;

        drained.Should().BeGreaterThan(0,
            "a full 3-second WebM/Opus sample must decode to non-empty PCM across the reader channel");
        (drained + remaining.Length).Should().BeGreaterThan(16_000,
            "3 seconds at 16 kHz is ~48 000 samples — tolerate a generous lower bound for lossy encoder warm-up");
    }

    [TestMethod]
    public async Task WriteAsync_UnknownSession_Throws()
    {
        await using var service = new FfmpegPcmStreamService(NullLogger<FfmpegPcmStreamService>.Instance);

        var act = async () => await service.WriteAsync(Guid.NewGuid(), [0, 1, 2], CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    [TestMethod]
    public async Task StopAsync_UnknownSession_IsNoOp()
    {
        await using var service = new FfmpegPcmStreamService(NullLogger<FfmpegPcmStreamService>.Instance);

        var samples = await service.StopAsync(Guid.NewGuid(), CancellationToken.None);

        samples.Should().BeEmpty();
    }

    [TestMethod]
    public async Task CancelAsync_UnknownSession_IsNoOp()
    {
        await using var service = new FfmpegPcmStreamService(NullLogger<FfmpegPcmStreamService>.Instance);

        var act = async () => await service.CancelAsync(Guid.NewGuid(), CancellationToken.None);

        await act.Should().NotThrowAsync();
    }

    [TestMethod]
    public async Task StartAsync_Twice_SameSession_Throws()
    {
        if (!HasFfmpeg()) Assert.Inconclusive("ffmpeg not installed in this sandbox");

        await using var service = new FfmpegPcmStreamService(NullLogger<FfmpegPcmStreamService>.Instance);
        var sessionId = Guid.NewGuid();

        await service.StartAsync(sessionId, CancellationToken.None);
        try
        {
            var act = async () => await service.StartAsync(sessionId, CancellationToken.None);
            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*already active*");
        }
        finally
        {
            await service.CancelAsync(sessionId, CancellationToken.None);
        }
    }

    [TestMethod]
    public async Task StopAsync_AfterMalformedPayload_SurfacesFfmpegStderrAndCleansUp()
    {
        if (!HasFfmpeg()) Assert.Inconclusive("ffmpeg not installed in this sandbox");

        await using var service = new FfmpegPcmStreamService(NullLogger<FfmpegPcmStreamService>.Instance);
        var sessionId = Guid.NewGuid();

        await service.StartAsync(sessionId, CancellationToken.None);

        var rubbish = new byte[512];
        System.Security.Cryptography.RandomNumberGenerator.Fill(rubbish);
        try
        {
            await service.WriteAsync(sessionId, rubbish, CancellationToken.None);
        }
        catch (InvalidOperationException)
        {
        }

        var act = async () => await service.StopAsync(sessionId, CancellationToken.None);

        await act.Should().ThrowAsync<InvalidOperationException>();

        var cancelAct = async () => await service.CancelAsync(sessionId, CancellationToken.None);
        await cancelAct.Should().NotThrowAsync();
    }

    private static string LocateFixtureDirectory()
    {
        var root = Path.Combine(AppContext.BaseDirectory, "Fixtures", "dictation-webm-chunks");
        return Directory.Exists(root) ? root : root; // Tests surface FileNotFound when absent.
    }

    private static bool HasFfmpeg()
    {
        var path = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        foreach (var dir in path.Split(Path.PathSeparator))
        {
            if (string.IsNullOrWhiteSpace(dir)) continue;
            if (File.Exists(Path.Combine(dir, "ffmpeg"))) return true;
            if (File.Exists(Path.Combine(dir, "ffmpeg.exe"))) return true;
        }
        return false;
    }
}
