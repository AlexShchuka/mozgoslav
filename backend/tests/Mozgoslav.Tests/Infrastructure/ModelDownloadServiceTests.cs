using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Services;

using NSubstitute;

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
    public async Task DownloadAsync_HappyPath_WritesFileAndReportsProgress()
    {
        var payload = RandomNumberGenerator.GetBytes(32_000);
        var factory = BuildFactory(_ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new ByteArrayContent(payload) });

        var destination = Path.Combine(_tempDirectory, "model.bin");
        var progress = new SynchronousProgress<ModelDownloadService.Progress>();

        var service = new ModelDownloadService(factory, NullLogger<ModelDownloadService>.Instance);
        var result = await service.DownloadAsync("https://example.invalid/model.bin", destination, progress, TestContext.CancellationToken);

        result.Should().Be(destination);
        File.Exists(destination).Should().BeTrue();
        new FileInfo(destination).Length.Should().Be(payload.Length);
        progress.Reports.Should().NotBeEmpty();
        progress.Reports[^1].BytesReceived.Should().Be(payload.Length);
    }

    [TestMethod]
    public async Task DownloadAsync_NotFound_Throws_AndDoesNotCreateDestination()
    {
        var factory = BuildFactory(_ => new HttpResponseMessage(HttpStatusCode.NotFound));

        var destination = Path.Combine(_tempDirectory, "missing.bin");
        var service = new ModelDownloadService(factory, NullLogger<ModelDownloadService>.Instance);

        Func<Task> act = () => service.DownloadAsync("https://example.invalid/missing.bin", destination, progress: null, TestContext.CancellationToken);

        await act.Should().ThrowAsync<HttpRequestException>();
        File.Exists(destination).Should().BeFalse();
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

    private IHttpClientFactory BuildFactory(Func<HttpRequestMessage, HttpResponseMessage> responder)
    {
        _handler?.Dispose();
        _client?.Dispose();
        var handler = new ScriptedHandler(responder);
        var client = new HttpClient(handler, disposeHandler: false);
        _handler = handler;
        _client = client;
        var factory = Substitute.For<IHttpClientFactory>();
#pragma warning disable IDISP004 
        factory.CreateClient(Arg.Any<string>()).Returns(client);
#pragma warning restore IDISP004
        return factory;
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
