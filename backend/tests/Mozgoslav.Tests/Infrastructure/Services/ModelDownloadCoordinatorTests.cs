using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Services;

[TestClass]
public sealed class ModelDownloadCoordinatorTests
{
    private sealed class Fixture : IDisposable
    {
        private readonly CancellationTokenSource _hostCts = new();
        private readonly IHttpClientFactory _httpClientFactory = Substitute.For<IHttpClientFactory>();
        public IHostApplicationLifetime Lifetime { get; } = Substitute.For<IHostApplicationLifetime>();
        public ModelDownloadService Downloader { get; }

        public Fixture()
        {
            Lifetime.ApplicationStopping.Returns(_hostCts.Token);
            Downloader = new ModelDownloadService(_httpClientFactory, NullLogger<ModelDownloadService>.Instance);
        }

        public ModelDownloadCoordinator BuildSut() =>
            new(Downloader, NullLogger<ModelDownloadCoordinator>.Instance, Lifetime);

        public void Dispose()
        {
            _hostCts.Dispose();
        }
    }

    [TestMethod]
    public void Start_BlankCatalogueId_ThrowsArgumentException()
    {
        using var fixture = new Fixture();
        using var sut = fixture.BuildSut();

        var act = () => sut.Start("", "http://example.com/model.bin", "/tmp/model.bin", CancellationToken.None);

        act.Should().Throw<ArgumentException>();
    }

    [TestMethod]
    public void Start_BlankUrl_ThrowsArgumentException()
    {
        using var fixture = new Fixture();
        using var sut = fixture.BuildSut();

        var act = () => sut.Start("my-model", "", "/tmp/model.bin", CancellationToken.None);

        act.Should().Throw<ArgumentException>();
    }

    [TestMethod]
    public void Start_BlankDestination_ThrowsArgumentException()
    {
        using var fixture = new Fixture();
        using var sut = fixture.BuildSut();

        var act = () => sut.Start("my-model", "http://example.com/model.bin", "", CancellationToken.None);

        act.Should().Throw<ArgumentException>();
    }

    [TestMethod]
    public void Start_ValidArgs_ReturnsNonEmptyDownloadId()
    {
        using var fixture = new Fixture();
        using var sut = fixture.BuildSut();

        var id = sut.Start("my-model", "http://example.com/model.bin", "/tmp/model.bin", CancellationToken.None);

        id.Should().NotBeNullOrEmpty();
    }

    [TestMethod]
    public void Start_CalledTwice_ReturnsDifferentDownloadIds()
    {
        using var fixture = new Fixture();
        using var sut = fixture.BuildSut();

        var id1 = sut.Start("model-a", "http://example.com/a.bin", "/tmp/a.bin", CancellationToken.None);
        var id2 = sut.Start("model-b", "http://example.com/b.bin", "/tmp/b.bin", CancellationToken.None);

        id1.Should().NotBe(id2);
    }

    [TestMethod]
    public async Task StreamAsync_UnknownDownloadId_YieldsDoneWithError()
    {
        using var fixture = new Fixture();
        using var sut = fixture.BuildSut();

        var events = new List<ModelDownloadProgress>();
        await foreach (var p in sut.StreamAsync("unknown-id", CancellationToken.None))
        {
            events.Add(p);
        }

        events.Should().HaveCount(1);
        events[0].Done.Should().BeTrue();
        events[0].Error.Should().Be("unknown-download-id");
    }

    [TestMethod]
    public async Task StreamAsync_Cancellation_EventuallyYieldsDoneProgress()
    {
        using var fixture = new Fixture();
        using var sut = fixture.BuildSut();

        using var cts = new CancellationTokenSource();
        var downloadId = sut.Start("model", "http://localhost:9/nonexistent.bin", "/tmp/test-model.bin", cts.Token);

        await cts.CancelAsync();

        var events = new List<ModelDownloadProgress>();
        using var streamCts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        try
        {
            await foreach (var p in sut.StreamAsync(downloadId, streamCts.Token))
            {
                events.Add(p);
                if (p.Done) break;
            }
        }
        catch (OperationCanceledException)
        {
        }

        events.Should().NotBeEmpty();
        events.Last().Done.Should().BeTrue();
    }

    [TestMethod]
    public void Dispose_WithActiveDownload_DoesNotThrow()
    {
        var act = () =>
        {
            using var fixture = new Fixture();
            using var sut = fixture.BuildSut();
            sut.Start("x", "http://localhost/x.bin", "/tmp/x.bin", CancellationToken.None);
        };

        act.Should().NotThrow();
    }
}
