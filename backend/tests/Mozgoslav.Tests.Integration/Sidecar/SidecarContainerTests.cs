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
                .WithCleanUp(false)
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
            catch (Exception) { }
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
