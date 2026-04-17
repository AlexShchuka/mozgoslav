using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text.Json;

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

/// <summary>
/// ADR-007 BC-004 (Phase 2 frontend coordination item) — the Dashboard record
/// button pushes Opus-in-WebM chunks to
/// <c>/api/dictation/{sessionId}/push</c> with Content-Type
/// <c>application/octet-stream</c>. The backend must decode them to 16 kHz
/// float32 mono PCM (the shape Whisper.net's streaming path accepts) before
/// forwarding into the session manager.
/// </summary>
[TestClass]
public sealed class DictationPushWebmOpusTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [TestMethod]
    public async Task Push_WebmOpusPayload_DecodesAndAccumulates()
    {
        var sink = new CapturingStreamingService();
        await using var factory = new DictationPushTestFactory(sink);
        using var client = factory.CreateClient();

        // Start a session.
        using var start = await client.PostAsync("/api/dictation/start", content: null, TestContext.CancellationToken);
        start.StatusCode.Should().Be(HttpStatusCode.OK);
        var startBody = await start.Content.ReadFromJsonAsync<StartResponse>(Json, TestContext.CancellationToken);
        startBody.Should().NotBeNull();
        var sessionId = startBody!.SessionId;

        try
        {
            var fixturePath = LocateFixture("dictation-sample.webm");
            var fixtureBytes = await File.ReadAllBytesAsync(fixturePath, TestContext.CancellationToken);
            fixtureBytes.Length.Should().BeGreaterThan(0);

            using var payload = new ByteArrayContent(fixtureBytes);
            payload.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

            using var response = await client.PostAsync(
                $"/api/dictation/{sessionId}/push", payload, TestContext.CancellationToken);

            response.StatusCode.Should().Be(HttpStatusCode.OK);

            // Stop cleanly — the streaming service drains and emits no partials.
            using var stop = await client.PostAsync(
                $"/api/dictation/stop/{sessionId}", content: null, TestContext.CancellationToken);
            stop.StatusCode.Should().Be(HttpStatusCode.OK);

            sink.ReceivedChunks.Should().NotBeEmpty(
                "the decoded WebM/Opus payload must reach the streaming transcription service");
            var pushedChunk = sink.ReceivedChunks[0];
            pushedChunk.SampleRate.Should().Be(16_000,
                "the push handler renormalises to the Whisper streaming rate");
            // The 1-second fixture at 16 kHz should decode to ~16 000 samples.
            pushedChunk.Samples.Length.Should().BeGreaterThan(8_000,
                "a 1 s sample decoded at 16 kHz should produce about 16 000 float samples");
        }
        finally
        {
            using var cancel = await client.PostAsync(
                $"/api/dictation/cancel/{sessionId}", content: null, TestContext.CancellationToken);
        }
    }

    private static string LocateFixture(string fileName)
    {
        // Content items copied to the test bin directory.
        var candidate = Path.Combine(AppContext.BaseDirectory, "_fixtures", fileName);
        if (File.Exists(candidate))
        {
            return candidate;
        }
        throw new FileNotFoundException($"Test fixture not found at {candidate}");
    }

    private sealed record StartResponse(Guid SessionId);

    public TestContext TestContext { get; set; } = null!;

    /// <summary>
    /// Fake <see cref="IStreamingTranscriptionService"/> that captures every
    /// audio chunk the session manager forwards. Emits no partials so
    /// <c>StopAsync</c> returns cleanly with empty text.
    /// </summary>
    private sealed class CapturingStreamingService : IStreamingTranscriptionService
    {
        public List<AudioChunk> ReceivedChunks { get; } = [];

        public async IAsyncEnumerable<PartialTranscript> TranscribeStreamAsync(
            IAsyncEnumerable<AudioChunk> chunks,
            string language,
            string? initialPrompt,
            [EnumeratorCancellation] CancellationToken ct)
        {
            await foreach (var chunk in chunks.WithCancellation(ct))
            {
                ReceivedChunks.Add(chunk);
            }
            yield break;
        }
    }

    private sealed class DictationPushTestFactory : WebApplicationFactory<Program>
    {
        private readonly CapturingStreamingService _sink;
        private readonly string _databasePath;

        public DictationPushTestFactory(CapturingStreamingService sink)
        {
            _sink = sink;
            _databasePath = Path.Combine(Path.GetTempPath(), $"mozgoslav-webm-{Guid.NewGuid():N}.db");
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

                // Replace IStreamingTranscriptionService with the capturing fake so we
                // can assert on the decoded PCM without needing Whisper on disk.
                for (var i = services.Count - 1; i >= 0; i--)
                {
                    if (services[i].ServiceType == typeof(IStreamingTranscriptionService))
                    {
                        services.RemoveAt(i);
                    }
                }
                services.AddSingleton<IStreamingTranscriptionService>(_sink);
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
