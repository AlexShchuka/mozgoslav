using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Infrastructure;

[TestClass]
public sealed class ModelDownloadServiceTests : IDisposable
{
    private string _tempDirectory = null!;
    private ScriptedHandler? _handler;
    private HttpClient? _client;
    private bool _disposed;

    [TestInitialize]
    public void Setup()
    {
        _tempDirectory = Path.Combine(Path.GetTempPath(), $"mozgoslav-model-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDirectory);
    }

    [TestCleanup]
    public void Cleanup() => Dispose();

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _client?.Dispose();
        _handler?.Dispose();
        try
        {
            if (Directory.Exists(_tempDirectory))
            {
                Directory.Delete(_tempDirectory, recursive: true);
            }
        }
        catch { }
    }

    [TestMethod]
    public async Task DownloadAsync_HappyPath_WritesPartialThenNull()
    {
        var payload = RandomNumberGenerator.GetBytes(32_000);
        var factory = BuildFactory(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(payload) });

        var destination = Path.Combine(_tempDirectory, "model.bin");
        var progress = new SynchronousProgress<ModelDownloadService.Progress>();

        var service = new ModelDownloadService(factory, NullLogger<ModelDownloadService>.Instance);
        var result = await service.DownloadAsync("https://example.invalid/model.bin", destination, 0, progress, TestContext.CancellationToken);

        result.Should().BeNull();
        File.Exists(destination + ".partial").Should().BeTrue();
        new FileInfo(destination + ".partial").Length.Should().Be(payload.Length);
        progress.Reports.Should().NotBeEmpty();
        progress.Reports[^1].BytesReceived.Should().Be(payload.Length);
    }

    [TestMethod]
    public async Task DownloadAsync_NotFound_ReturnsNotFoundErrorKind()
    {
        var factory = BuildFactory(_ => new HttpResponseMessage(HttpStatusCode.NotFound));

        var destination = Path.Combine(_tempDirectory, "missing.bin");
        var service = new ModelDownloadService(factory, NullLogger<ModelDownloadService>.Instance);

        var result = await service.DownloadAsync("https://example.invalid/missing.bin", destination, 0, null, TestContext.CancellationToken);

        result.Should().Be(DownloadErrorKind.NotFound);
        File.Exists(destination).Should().BeFalse();
    }

    [TestMethod]
    public async Task DownloadAsync_ServerError_ReturnsTransientErrorKind()
    {
        var factory = BuildFactory(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError));

        var destination = Path.Combine(_tempDirectory, "error.bin");
        var service = new ModelDownloadService(factory, NullLogger<ModelDownloadService>.Instance);

        var result = await service.DownloadAsync("https://example.invalid/error.bin", destination, 0, null, TestContext.CancellationToken);

        result.Should().Be(DownloadErrorKind.Transient);
    }

    [TestMethod]
    public async Task DownloadAsync_WithResumeFrom_SendsRangeHeader()
    {
        HttpRequestMessage? capturedRequest = null;
        var payload = RandomNumberGenerator.GetBytes(16_000);
        var factory = BuildFactory(req =>
        {
            capturedRequest = req;
            return new HttpResponseMessage(HttpStatusCode.PartialContent) { Content = new ByteArrayContent(payload) };
        });

        var destination = Path.Combine(_tempDirectory, "resume.bin");
        var service = new ModelDownloadService(factory, NullLogger<ModelDownloadService>.Instance);

        await service.DownloadAsync("https://example.invalid/resume.bin", destination, 1024, null, TestContext.CancellationToken);

        capturedRequest.Should().NotBeNull();
        capturedRequest.Headers.Range.Should().NotBeNull();
        capturedRequest.Headers.Range.Ranges.Should().HaveCount(1);
        capturedRequest.Headers.Range.Ranges.First().From.Should().Be(1024);
    }

    [TestMethod]
    public async Task ComputeSha256Async_MissingFile_ReturnsNull()
    {
        var result = await ModelDownloadService.ComputeSha256Async(
            Path.Combine(_tempDirectory, "does-not-exist.bin"),
            TestContext.CancellationToken);
        result.Should().BeNull();
    }

    [TestMethod]
    public async Task ComputeSha256Async_ExistingFile_ReturnsLowercaseHex()
    {
        var path = Path.Combine(_tempDirectory, "sample.bin");
        await File.WriteAllBytesAsync(path, [1, 2, 3, 4, 5], TestContext.CancellationToken);

        var hash = await ModelDownloadService.ComputeSha256Async(path, TestContext.CancellationToken);

        hash.Should().NotBeNull();
        hash.Should().MatchRegex("^[0-9a-f]{64}$");
    }

    [TestMethod]
    public void GetPartialSize_NoPartialFile_ReturnsZero()
    {
        var destination = Path.Combine(_tempDirectory, "nonexistent.bin");
        var size = ModelDownloadService.GetPartialSize(destination);
        size.Should().Be(0);
    }

    [TestMethod]
    public async Task GetPartialSize_PartialFileExists_ReturnsFileSize()
    {
        var destination = Path.Combine(_tempDirectory, "partial.bin");
        var partialPath = destination + ".partial";
        await File.WriteAllBytesAsync(partialPath, new byte[512], TestContext.CancellationToken);

        var size = ModelDownloadService.GetPartialSize(destination);
        size.Should().Be(512);
    }

    [TestMethod]
    public async Task DeletePartial_PartialFileExists_RemovesFile()
    {
        var destination = Path.Combine(_tempDirectory, "todelete.bin");
        var partialPath = destination + ".partial";
        await File.WriteAllBytesAsync(partialPath, [1, 2, 3], TestContext.CancellationToken);

        ModelDownloadService.DeletePartial(destination);

        File.Exists(partialPath).Should().BeFalse();
    }

    [TestMethod]
    public async Task MovePartialToDestinationAsync_PartialExists_MovesToDestination()
    {
        var destination = Path.Combine(_tempDirectory, "moved.bin");
        var partialPath = destination + ".partial";
        await File.WriteAllBytesAsync(partialPath, [9, 8, 7], TestContext.CancellationToken);

        await ModelDownloadService.MovePartialToDestinationAsync(destination);

        File.Exists(partialPath).Should().BeFalse();
        File.Exists(destination).Should().BeTrue();
        (await File.ReadAllBytesAsync(destination, TestContext.CancellationToken)).Should().Equal([9, 8, 7]);
    }

    private IHttpClientFactory BuildFactory(Func<HttpRequestMessage, HttpResponseMessage> responder)
    {
        _handler?.Dispose();
        _client?.Dispose();
        _handler = new ScriptedHandler(responder);
        _client = new HttpClient(_handler, disposeHandler: false);
        return new StubHttpClientFactory(_client);
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        private readonly HttpClient _client;
        public StubHttpClientFactory(HttpClient client) => _client = client;
        public HttpClient CreateClient(string name) => _client;
    }

    public required TestContext TestContext { get; set; }

    private sealed class ScriptedHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public ScriptedHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        {
            _responder = responder;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var response = _responder(request);
            return Task.FromResult(response);
        }
    }

    private sealed class SynchronousProgress<T> : IProgress<T>
    {
        public List<T> Reports { get; } = [];

        public void Report(T value) => Reports.Add(value);
    }
}
