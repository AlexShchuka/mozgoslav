using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
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

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.ValueObjects;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class InternalDictationPushRawPcmTests
{
    public TestContext TestContext { get; set; } = null!;

    [TestMethod]
    public async Task Push_UnknownSession_RawPcm_Returns404()
    {
        await using var factory = new RawPcmTestFactory();
        using var client = factory.CreateClient();

        var samples = new float[] { 0.1f, 0.2f, 0.3f, 0.4f };
        var bytes = new byte[samples.Length * sizeof(float)];
        Buffer.BlockCopy(samples, 0, bytes, 0, bytes.Length);

        using var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue("audio/pcm");

        using var response = await client.PostAsync(
            $"/api/dictation/{Guid.NewGuid()}/push", content,
            cancellationToken: TestContext.CancellationToken);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [TestMethod]
    public async Task Push_EmptyPayload_Returns400()
    {
        await using var factory = new RawPcmTestFactory();
        using var client = factory.CreateClient();
        var manager = factory.Services.GetRequiredService<IDictationSessionManager>();
        var session = manager.Start(source: "test");

        try
        {
            using var content = new ByteArrayContent(Array.Empty<byte>());
            content.Headers.ContentType = new MediaTypeHeaderValue("audio/pcm");

            using var response = await client.PostAsync(
                $"/api/dictation/{session.Id}/push", content,
                cancellationToken: TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
        finally
        {
            try { await manager.CancelAsync(session.Id, TestContext.CancellationToken); } catch { }
        }
    }

    [TestMethod]
    public async Task Push_RawPcm_HappyPath_Accepted()
    {
        await using var factory = new RawPcmTestFactory();
        using var client = factory.CreateClient();
        var manager = factory.Services.GetRequiredService<IDictationSessionManager>();
        var session = manager.Start(source: "test");

        try
        {
            var samples = new float[16];
            for (var i = 0; i < samples.Length; i++)
            {
                samples[i] = 0.01f * i;
            }
            var bytes = new byte[samples.Length * sizeof(float)];
            Buffer.BlockCopy(samples, 0, bytes, 0, bytes.Length);

            using var content = new ByteArrayContent(bytes);
            content.Headers.ContentType = new MediaTypeHeaderValue("audio/pcm");

            using var response = await client.PostAsync(
                $"/api/dictation/{session.Id}/push", content,
                cancellationToken: TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
        finally
        {
            try { await manager.CancelAsync(session.Id, TestContext.CancellationToken); } catch { }
        }
    }

    private sealed class NoOpStreamingService : IStreamingTranscriptionService
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

    private sealed class RawPcmTestFactory : WebApplicationFactory<Program>
    {
        private readonly string _databasePath;

        public RawPcmTestFactory()
        {
            _databasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-rawpcm-{Guid.NewGuid():N}.db");
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

                for (var i = services.Count - 1; i >= 0; i--)
                {
                    if (services[i].ServiceType == typeof(IStreamingTranscriptionService))
                    {
                        services.RemoveAt(i);
                    }
                }
                services.AddSingleton<IStreamingTranscriptionService, NoOpStreamingService>();
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
}
