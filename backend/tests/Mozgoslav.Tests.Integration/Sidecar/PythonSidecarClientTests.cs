using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;

namespace Mozgoslav.Tests.Integration.Sidecar;

/// <summary>
/// Contract tests for <see cref="PythonSidecarClient"/>. WireMock fakes
/// the python sidecar so we can assert on the wire shape (paths, JSON
/// field names, 503 envelope handling) without paying the Docker image
/// build cost on every test run.
///
/// End-to-end coverage against the real sidecar container lives in
/// <see cref="SidecarContainerTests"/> (Docker-gated).
/// </summary>
[TestClass]
public sealed class PythonSidecarClientTests : IDisposable
{
    private WireMockServer _server = null!;
    private HttpClient _http = null!;
    private PythonSidecarClient _client = null!;
    private bool _disposed;

    [TestInitialize]
    public void Setup()
    {
        _server = WireMockServer.Start();
        _http = new HttpClient { BaseAddress = new Uri(_server.Urls[0]) };
        _client = new PythonSidecarClient(_http, NullLogger<PythonSidecarClient>.Instance);
    }

    [TestCleanup]
    public void Cleanup() => Dispose();

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _http?.Dispose();
        _server?.Stop();
        _server?.Dispose();
    }

    [TestMethod]
    public async Task DiarizeAsync_HappyPath_ParsesSegmentsAndSpeakerCount()
    {
        _server.Given(Request.Create().WithPath("/api/diarize").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""
                    {
                      "segments": [
                        { "speaker": "A", "start": 0.0, "end": 1.5 },
                        { "speaker": "B", "start": 1.5, "end": 3.0 }
                      ],
                      "num_speakers": 2
                    }
                    """));

        var result = await _client.DiarizeAsync("/tmp/audio.wav", TestContext.CancellationToken);

        result.NumSpeakers.Should().Be(2);
        result.Segments.Should().HaveCount(2);
        result.Segments[0].Speaker.Should().Be("A");
        result.Segments[0].Start.Should().Be(0.0);
        result.Segments[0].End.Should().Be(1.5);
    }

    [TestMethod]
    public async Task GenderAsync_When503ModelNotInstalled_ThrowsTypedException()
    {
        _server.Given(Request.Create().WithPath("/api/gender").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(503)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""
                    {
                      "error": "model_not_installed",
                      "model_id": "audeering-age-gender",
                      "download_url": "https://huggingface.co/audeering/wav2vec2-large-robust-24-ft-age-gender",
                      "hint": "Download via Settings → Models."
                    }
                    """));

        var act = () => _client.GenderAsync("/tmp/audio.wav", TestContext.CancellationToken);

        var ex = await act.Should().ThrowAsync<SidecarModelUnavailableException>();
        ex.Which.ModelId.Should().Be("audeering-age-gender");
        ex.Which.DownloadUrl.Should().Be("https://huggingface.co/audeering/wav2vec2-large-robust-24-ft-age-gender");
        ex.Which.Hint.Should().Contain("Settings");
    }

    [TestMethod]
    public async Task EmotionAsync_When503ModelNotInstalled_ThrowsTypedException()
    {
        _server.Given(Request.Create().WithPath("/api/emotion").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(503)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""
                    {
                      "error": "model_not_installed",
                      "model_id": "audeering-emotion-msp-dim",
                      "download_url": "https://huggingface.co/audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim",
                      "hint": "Download via Settings → Models."
                    }
                    """));

        var act = () => _client.EmotionAsync("/tmp/audio.wav", TestContext.CancellationToken);

        var ex = await act.Should().ThrowAsync<SidecarModelUnavailableException>();
        ex.Which.ModelId.Should().Be("audeering-emotion-msp-dim");
    }

    [TestMethod]
    public async Task NerAsync_HappyPath_ParsesAllBuckets()
    {
        _server.Given(Request.Create().WithPath("/api/ner").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""
                    {
                      "people": ["Иван", "Мария"],
                      "orgs": ["Яндекс"],
                      "locations": ["Москва"],
                      "dates": ["15.5.2024"]
                    }
                    """));

        var result = await _client.NerAsync("sample text", TestContext.CancellationToken);

        result.People.Should().BeEquivalentTo("Иван", "Мария");
        result.Orgs.Should().BeEquivalentTo("Яндекс");
        result.Locations.Should().BeEquivalentTo("Москва");
        result.Dates.Should().BeEquivalentTo("15.5.2024");
    }

    [TestMethod]
    public async Task GenderAsync_When200_ReturnsTypedResult()
    {
        _server.Given(Request.Create().WithPath("/api/gender").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody("""{"gender":"female","confidence":0.82}"""));

        var result = await _client.GenderAsync("/tmp/audio.wav", TestContext.CancellationToken);

        result.Gender.Should().Be("female");
        result.Confidence.Should().Be(0.82);
    }

    [TestMethod]
    public async Task DiarizeAsync_WhenSidecarDown_PropagatesHttpRequestException()
    {
        // Stop the server so the call fails at the socket layer.
        _server.Stop();

        var act = () => _client.DiarizeAsync("/tmp/audio.wav", TestContext.CancellationToken);

        await act.Should().ThrowAsync<HttpRequestException>();
    }

    public TestContext TestContext { get; set; } = null!;
}
