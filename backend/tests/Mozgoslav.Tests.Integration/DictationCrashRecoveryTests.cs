using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.ValueObjects;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// ADR-004 R5 / BC-009 — crash-recovery PCM dump. Every audio chunk written
/// during a dictation session is mirrored to a per-session file in the temp
/// dir. On clean stop / cancel the file is deleted; if the backend crashes
/// mid-session the file is left behind so the user can recover audio that
/// never reached the LLM. On the next start the session manager logs a WARN
/// for every orphan it finds.
/// </summary>
[TestClass]
public sealed class DictationCrashRecoveryTests
{
    [TestMethod]
    public async Task CrashMidSession_PcmBufferPersistsOnDisk()
    {
        var tempDir = Path.Combine(
            Path.GetTempPath(),
            $"mozgoslav-crash-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);

        try
        {
            await using var factory = new DictationTestFactory(tempDir, new ConcurrentQueue<string>());
            using var _ = factory.CreateClient();

            using var scope = factory.Services.CreateScope();
            var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();
            await settings.LoadAsync(TestContext.CancellationToken);
            await settings.SaveAsync(
                settings.Snapshot with { DictationTempAudioPath = tempDir },
                TestContext.CancellationToken);

            var manager = factory.Services.GetRequiredService<IDictationSessionManager>();
            var session = manager.Start();

            try
            {
                var samples = new[] { 0.10f, 0.20f, 0.30f, 0.40f };
                await manager.PushAudioAsync(
                    session.Id,
                    new AudioChunk(samples, 16_000, TimeSpan.Zero),
                    TestContext.CancellationToken);

                var expectedBytes = samples.Length * sizeof(float);

                await WaitForAsync(
                    () => Directory.EnumerateFiles(tempDir, "dictation-*.pcm")
                        .Any(p => SafeFileLength(p) >= expectedBytes),
                    TimeSpan.FromSeconds(5));

                var pcmPath = Directory.EnumerateFiles(tempDir, "dictation-*.pcm").Single();
                pcmPath.Should().Contain(session.Id.ToString());
                File.Exists(pcmPath).Should().BeTrue(
                    "chunks are tee'd to disk so the user can recover audio after an unclean shutdown");

                await using var readStream = new FileStream(
                    pcmPath,
                    FileMode.Open,
                    FileAccess.Read,
                    FileShare.ReadWrite);
                readStream.Length.Should().BeGreaterThanOrEqualTo(expectedBytes,
                    "each pushed sample contributes 4 LE bytes");
            }
            finally
            {
                await manager.CancelAsync(session.Id, TestContext.CancellationToken);
            }
        }
        finally
        {
            TryDeleteDirectory(tempDir);
        }
    }

    [TestMethod]
    public async Task Startup_OrphanPcmFile_LogsWarning()
    {
        var tempDir = Path.Combine(
            Path.GetTempPath(),
            $"mozgoslav-orphan-{Guid.NewGuid():N}");
        Directory.CreateDirectory(tempDir);

        var orphanPath = Path.Combine(tempDir, $"dictation-{Guid.NewGuid():D}.pcm");
        await File.WriteAllBytesAsync(orphanPath, [1, 2, 3, 4], TestContext.CancellationToken);

        var captured = new ConcurrentQueue<string>();

        try
        {
            await using var factory = new DictationTestFactory(tempDir, captured);
            using var _ = factory.CreateClient();

            using var scope = factory.Services.CreateScope();
            var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();
            await settings.LoadAsync(TestContext.CancellationToken);
            await settings.SaveAsync(
                settings.Snapshot with { DictationTempAudioPath = tempDir },
                TestContext.CancellationToken);

            var manager = factory.Services.GetRequiredService<IDictationSessionManager>();
            var session = manager.Start();
            await manager.CancelAsync(session.Id, TestContext.CancellationToken);

            var warningLines = captured
                .Where(line => line.Contains("orphan", StringComparison.OrdinalIgnoreCase)
                            || line.Contains("Orphan", StringComparison.Ordinal))
                .ToArray();

            warningLines.Should().NotBeEmpty(
                "BC-009 — orphan .pcm files must surface a warning so the user / ops know to recover them");
        }
        finally
        {
            TryDeleteDirectory(tempDir);
        }
    }

    private static long SafeFileLength(string path)
    {
        try
        {
            using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            return fs.Length;
        }
        catch (IOException)
        {
            return 0;
        }
    }

    private static async Task WaitForAsync(Func<bool> predicate, TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (!predicate() && DateTime.UtcNow < deadline)
        {
            await Task.Delay(25);
        }
        if (!predicate())
        {
            throw new TimeoutException($"Condition not reached within {timeout}");
        }
    }

    private static void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
        }
        catch (IOException) { }
        catch (UnauthorizedAccessException) { }
    }

    public TestContext TestContext { get; set; } = null!;

    private sealed class DictationTestFactory : WebApplicationFactory<Program>
    {
        private readonly ConcurrentQueue<string> _captured;
        private readonly string _databasePath;

        public DictationTestFactory(string _, ConcurrentQueue<string> captured)
        {
            _captured = captured;
            _databasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-crashdb-{Guid.NewGuid():N}.db");
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("IntegrationTest");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Mozgoslav:DatabasePath"] = _databasePath,
                });
            });
            builder.ConfigureTestServices(services =>
            {
                var connectionString = $"Data Source={_databasePath}";
                for (var i = services.Count - 1; i >= 0; i--)
                {
                    var ns = services[i].ServiceType.Namespace;
                    if (ns is not null && ns.StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal))
                    {
                        services.RemoveAt(i);
                    }
                }
                for (var i = services.Count - 1; i >= 0; i--)
                {
                    if (services[i].ServiceType == typeof(MozgoslavDbContext))
                    {
                        services.RemoveAt(i);
                    }
                }
                services.AddDbContextFactory<MozgoslavDbContext>(options => options.UseSqlite(connectionString));
                services.AddDbContext<MozgoslavDbContext>(
                    options => options.UseSqlite(connectionString),
                    contextLifetime: ServiceLifetime.Scoped,
                    optionsLifetime: ServiceLifetime.Singleton);

                services.AddSingleton<ILogger<DictationSessionManager>>(_ =>
                    new CapturingLogger<DictationSessionManager>(_captured));

                for (var i = services.Count - 1; i >= 0; i--)
                {
                    if (services[i].ServiceType == typeof(IStreamingTranscriptionService))
                    {
                        services.RemoveAt(i);
                    }
                }
                services.AddSingleton<IStreamingTranscriptionService, PassThroughStreamingService>();
            });
        }

        protected override void Dispose(bool disposing)
        {
            base.Dispose(disposing);
            if (!disposing) return;
            foreach (var path in new[] { _databasePath, _databasePath + "-wal", _databasePath + "-shm" })
            {
                try { if (File.Exists(path)) File.Delete(path); }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
        }

    }

    /// <summary>
    /// Drains the audio stream without emitting any partials — exercises the
    /// tee-to-PCM-buffer path without needing a real Whisper model on disk.
    /// </summary>
    private sealed class PassThroughStreamingService : IStreamingTranscriptionService
    {
        public async IAsyncEnumerable<PartialTranscript> TranscribeStreamAsync(
            IAsyncEnumerable<AudioChunk> chunks,
            string language,
            string? initialPrompt,
            [EnumeratorCancellation] CancellationToken ct)
        {
            await foreach (var _ in chunks.WithCancellation(ct))
            {
            }
            yield break;
        }

        public Task<string> TranscribeSamplesAsync(
            float[] samples,
            string language,
            string? initialPrompt,
            CancellationToken ct) => Task.FromResult(string.Empty);
    }
}
