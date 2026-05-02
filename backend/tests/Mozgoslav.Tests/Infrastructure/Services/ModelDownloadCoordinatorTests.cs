using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Observability;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Services;

[TestClass]
public sealed class ModelDownloadCoordinatorTests : IDisposable
{
    private readonly IHttpClientFactory _httpClientFactory = Substitute.For<IHttpClientFactory>();
    private readonly IDownloadJobRepository _repo = Substitute.For<IDownloadJobRepository>();
    private readonly MozgoslavMetrics _metrics = new();
    private ModelDownloadCoordinator _sut = null!;
    private bool _disposed;

    [TestInitialize]
    public void Setup()
    {
        var downloader = new ModelDownloadService(_httpClientFactory, NullLogger<ModelDownloadService>.Instance);
        _sut = new ModelDownloadCoordinator(
            downloader,
            _repo,
            _metrics,
            Options.Create(new ModelDownloadCoordinatorOptions()),
            NullLogger<ModelDownloadCoordinator>.Instance);
    }

    [TestCleanup]
    public void Cleanup() => Dispose();

    public void Dispose()
    {
        if (_disposed) return;
        _disposed = true;
        _sut?.Dispose();
        _metrics.Dispose();
    }

    [TestMethod]
    public async Task StartAsync_BlankCatalogueId_ThrowsArgumentException()
    {
        var act = () => _sut.StartAsync("", "http://example.com/model.bin", "/tmp/model.bin", null, CancellationToken.None);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task StartAsync_BlankUrl_ThrowsArgumentException()
    {
        var act = () => _sut.StartAsync("my-model", "", "/tmp/model.bin", null, CancellationToken.None);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task StartAsync_BlankDestination_ThrowsArgumentException()
    {
        var act = () => _sut.StartAsync("my-model", "http://example.com/model.bin", "", null, CancellationToken.None);
        await act.Should().ThrowAsync<ArgumentException>();
    }

    [TestMethod]
    public async Task StartAsync_ValidArgs_ReturnsNonEmptyDownloadId()
    {
        var id = await _sut.StartAsync("my-model", "http://example.com/model.bin", "/tmp/model.bin", null, CancellationToken.None);
        id.Should().NotBeNullOrEmpty();
    }

    [TestMethod]
    public async Task StartAsync_CalledTwice_ReturnsDifferentDownloadIds()
    {
        var id1 = await _sut.StartAsync("model-a", "http://example.com/a.bin", "/tmp/a.bin", null, CancellationToken.None);
        var id2 = await _sut.StartAsync("model-b", "http://example.com/b.bin", "/tmp/b.bin", null, CancellationToken.None);
        id1.Should().NotBe(id2);
    }

    [TestMethod]
    public async Task StreamAsync_UnknownDownloadId_YieldsFailedPhaseWithError()
    {
        var events = new List<ModelDownloadProgress>();
        await foreach (var p in _sut.StreamAsync("unknown-id", CancellationToken.None))
        {
            events.Add(p);
        }

        events.Should().HaveCount(1);
        events[0].Phase.Should().Be(DownloadState.Failed);
        events[0].Error.Should().Be("unknown-download-id");
    }

    [TestMethod]
    public async Task StreamAsync_Cancellation_EventuallyYieldsTerminalPhase()
    {
        using var cts = new CancellationTokenSource();
        var downloadId = await _sut.StartAsync("model", "http://localhost:9/nonexistent.bin", "/tmp/test-model.bin", null, cts.Token);

        await cts.CancelAsync();

        var events = new List<ModelDownloadProgress>();
        using var streamCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        try
        {
            await foreach (var p in _sut.StreamAsync(downloadId, streamCts.Token))
            {
                events.Add(p);
                if (IsTerminal(p.Phase)) break;
            }
        }
        catch (OperationCanceledException)
        {
        }

        events.Should().NotBeEmpty();
        IsTerminal(events.Last().Phase).Should().BeTrue();
    }

    [TestMethod]
    public async Task TryCancelAsync_UnknownDownloadId_ReturnsNotFound()
    {
        var error = await _sut.TryCancelAsync("does-not-exist", CancellationToken.None);
        error.Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task ListActiveAsync_NoActiveJobs_ReturnsEmpty()
    {
        _repo.ListActiveAsync(Arg.Any<CancellationToken>())
            .Returns(Array.Empty<Mozgoslav.Domain.Entities.DownloadJob>());

        var result = await _sut.ListActiveAsync(CancellationToken.None);

        result.Should().BeEmpty();
    }

    [TestMethod]
    public void Dispose_WithActiveDownload_DoesNotThrow()
    {
        var act = () =>
        {
            _ = _sut.StartAsync("x", "http://localhost/x.bin", "/tmp/x.bin", null, CancellationToken.None);
            _sut.Dispose();
        };

        act.Should().NotThrow();
    }

    private static bool IsTerminal(DownloadState state) =>
        state is DownloadState.Completed or DownloadState.Failed or DownloadState.Cancelled;
}
