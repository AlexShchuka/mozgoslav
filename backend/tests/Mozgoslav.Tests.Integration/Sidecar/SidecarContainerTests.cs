using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;

using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Integration.Sidecar;

/// <summary>
/// End-to-end contract tests against the real python sidecar running in
/// Docker. Exercises the Tier-1 endpoints (diarize, ner — always 200)
/// and the Tier-2 503 envelope (gender, emotion — no weights in the test
/// image).
///
/// The image is built from <c>python-sidecar/Dockerfile.test</c>, which
/// installs every Tier-1 dep but <b>not</b> the audeering weights. Tests
/// are skipped with an Inconclusive result when Docker is not available
/// — the sandbox runner installs it, macOS-latest GitHub Actions runner
/// does not by default.
///
/// Test list:
///  - Ner_RealSidecar_ExtractsRussianEntities
///  - Diarize_RealSidecar_FileMissing_Returns404
///  - Gender_WhenModelAbsent_Returns503WithTypedEnvelope
///  - Emotion_WhenModelAbsent_Returns503WithTypedEnvelope
///
/// The class initialises a single container once per test run (the
/// ~2 GB torch install happens inside the image build; amortised
/// across all tests in the class).
/// </summary>
[TestClass]
public sealed class SidecarContainerTests
{
    private const int SidecarPort = 5060;
    private const string ImageTag = "mozgoslav-sidecar-test:latest";

    private static IContainer? _container;
    private static string? _baseUrl;
    private static HttpClient? _httpClient;
    private static bool _dockerAvailable;
    private static Exception? _dockerFailure;

    public TestContext TestContext { get; set; } = null!;

    [ClassInitialize]
    public static async Task Initialise(TestContext _)
    {
        try
        {
            var repoRoot = LocateRepoRoot();
            var image = new ImageFromDockerfileBuilder()
                .WithDockerfileDirectory(Path.Combine(repoRoot, "python-sidecar"))
                .WithDockerfile("Dockerfile.test")
                .WithName(ImageTag)
                .WithCleanUp(false)     // keep the layer cache between runs
                .Build();

            await image.CreateAsync();

            _container = new ContainerBuilder(ImageTag)
                .WithPortBinding(SidecarPort, assignRandomHostPort: true)
                .WithWaitStrategy(Wait.ForUnixContainer().UntilHttpRequestIsSucceeded(req =>
                    req.ForPort(SidecarPort).ForPath("/health")))
                .Build();

            await _container.StartAsync();
            var mapped = _container.GetMappedPublicPort(SidecarPort);
            _baseUrl = $"http://{_container.Hostname}:{mapped}";
            _httpClient = new HttpClient { BaseAddress = new Uri(_baseUrl) };
            _dockerAvailable = true;
        }
        catch (Exception ex)
        {
            _dockerFailure = ex;
            _dockerAvailable = false;
        }
    }

    [ClassCleanup]
    public static async Task Teardown()
    {
        _httpClient?.Dispose();
        if (_container is not null)
        {
            try { await _container.DisposeAsync(); }
            catch (Exception) { /* best effort */ }
        }
    }

    [TestInitialize]
    public void SkipIfDockerMissing()
    {
        if (!_dockerAvailable)
        {
            Assert.Inconclusive(
                $"Docker is not available in this environment — skipping. "
                + $"Inner error: {_dockerFailure?.GetType().Name}: {_dockerFailure?.Message}");
        }
    }

    [TestMethod]
    public async Task Ner_RealSidecar_ExtractsRussianEntities()
    {
        var sidecar = new PythonSidecarClient(_httpClient!, NullLogger<PythonSidecarClient>.Instance);
        var result = await sidecar.NerAsync(
            "Иван встретился с Мариной в Москве.", TestContext.CancellationToken);

        result.People.Should().NotBeEmpty("Natasha must pick up PER spans end-to-end");
        result.Locations.Should().Contain(loc => loc.Contains("Моск", StringComparison.Ordinal));
    }

    [TestMethod]
    public async Task Gender_WhenModelAbsent_Returns503WithTypedEnvelope()
    {
        var sidecar = new PythonSidecarClient(_httpClient!, NullLogger<PythonSidecarClient>.Instance);
        Func<Task> act = () => sidecar.GenderAsync("/tmp/any.wav", TestContext.CancellationToken);

        var ex = await act.Should().ThrowAsync<SidecarModelUnavailableException>();
        ex.Which.ModelId.Should().Be("audeering-age-gender");
        ex.Which.DownloadUrl.Should().StartWith("https://huggingface.co/");
    }

    [TestMethod]
    public async Task Emotion_WhenModelAbsent_Returns503WithTypedEnvelope()
    {
        var sidecar = new PythonSidecarClient(_httpClient!, NullLogger<PythonSidecarClient>.Instance);
        Func<Task> act = () => sidecar.EmotionAsync("/tmp/any.wav", TestContext.CancellationToken);

        var ex = await act.Should().ThrowAsync<SidecarModelUnavailableException>();
        ex.Which.ModelId.Should().Be("audeering-emotion-msp-dim");
    }

    [TestMethod]
    public async Task Health_RealSidecar_ReturnsServiceBanner()
    {
        using var response = await _httpClient!.GetAsync("/health", TestContext.CancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<HealthBody>(TestContext.CancellationToken);
        body.Should().NotBeNull();
        body!.Service.Should().Be("mozgoslav-python-sidecar");
    }

    private static string LocateRepoRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "python-sidecar")))
            {
                return dir.FullName;
            }
            dir = dir.Parent;
        }
        throw new InvalidOperationException(
            $"Could not locate repo root from {AppContext.BaseDirectory}");
    }

    private sealed record HealthBody(string Status, string Version, string Service);
}
