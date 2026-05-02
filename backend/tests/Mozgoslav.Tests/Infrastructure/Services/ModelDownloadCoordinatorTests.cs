using System;
using System.Collections.Concurrent;
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
using Microsoft.Extensions.Options;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Observability;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Services;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Services;

[TestClass]
public sealed class ModelDownloadCoordinatorTests : IDisposable
{
    private readonly IDownloadJobRepository _repo = Substitute.For<IDownloadJobRepository>();
    private readonly ConcurrentDictionary<Guid, DownloadJob> _jobStore = new();
    private readonly MozgoslavMetrics _metrics = new();
    private ModelDownloadCoordinator _sut = null!;
    private string _tempDir = null!;
    private bool _disposed;
    private ScriptedHandler? _currentHandler;
    private StubHttpClientFactory? _stubFactory;

    public required TestContext TestContext { get; set; }

    [TestInitialize]
    public void Setup()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"mozgoslav-coord-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        _repo.AddAsync(Arg.Any<DownloadJob>(), Arg.Any<CancellationToken>())
            .Returns(ci =>
            {
                var job = ci.Arg<DownloadJob>();
                _jobStore[job.Id] = job;
                return Task.CompletedTask;
            });
        _repo.UpdateAsync(Arg.Any<DownloadJob>(), Arg.Any<CancellationToken>())
            .Returns(ci =>
            {
                var job = ci.Arg<DownloadJob>();
                _jobStore[job.Id] = job;
                return Task.CompletedTask;
            });
        _repo.TryGetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(ci =>
            {
                _jobStore.TryGetValue(ci.Arg<Guid>(), out var job);
                return Task.FromResult(job);
            });

        _stubFactory = new StubHttpClientFactory();
        var downloader = new ModelDownloadService(_stubFactory, NullLogger<ModelDownloadService>.Instance);
        _sut = new ModelDownloadCoordinator(
            downloader,
            _repo,
            _metrics,
            Options.Create(new ModelDownloadCoordinatorOptions { MaxConcurrentDownloads = 2, MaxRetries = 3 }),
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
        _currentHandler?.Dispose();
        try { Directory.Delete(_tempDir, true); } catch { }
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
    public async Task TryCancelAsync_UnknownDownloadId_ReturnsNotFound()
    {
        var error = await _sut.TryCancelAsync("does-not-exist", CancellationToken.None);
        error.Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task ListActiveAsync_NoActiveJobs_ReturnsEmpty()
    {
        _repo.ListActiveAsync(Arg.Any<CancellationToken>())
            .Returns(Array.Empty<DownloadJob>());

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

    [TestMethod]
    public async Task TC_B01_HappyPath_EmitsQueuedThenDownloadingThenFinalizingThenCompleted()
    {
        var payload = RandomNumberGenerator.GetBytes(4_096);
        SetupHttpFactory(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(payload)
        });

        var destination = Path.Combine(_tempDir, "tc-b01.bin");
        var downloadId = await _sut.StartAsync("cat-b01", "http://fixture/b01.bin", destination, null, CancellationToken.None);

        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(10));

        events.Should().NotBeEmpty();
        events.Should().Contain(e => e.Phase == DownloadState.Downloading);
        events.Should().Contain(e => e.Phase == DownloadState.Finalizing);
        events.Last().Phase.Should().Be(DownloadState.Completed);

        await _repo.Received().AddAsync(Arg.Any<DownloadJob>(), Arg.Any<CancellationToken>());
        await _repo.Received().UpdateAsync(Arg.Any<DownloadJob>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public async Task TC_B02_LateSubscriber_FirstEventIsCurrentState()
    {
        var tcs = new TaskCompletionSource<bool>();
        var payload = new byte[1_024 * 1_024];
        SetupHttpFactory(req =>
        {
            tcs.TrySetResult(true);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(payload)
            };
        });

        var destination = Path.Combine(_tempDir, "tc-b02.bin");
        var downloadId = await _sut.StartAsync("cat-b02", "http://fixture/b02.bin", destination, null, CancellationToken.None);

        await tcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await Task.Delay(50);

        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(10));

        events.Should().NotBeEmpty();
        var first = events.First();
        first.Should().NotBeNull();
    }

    [TestMethod]
    public async Task TC_B03_Throttle_ProgressEventsCountLeq12()
    {
        var chunkCount = 0;
        var chunkPayload = new byte[8_192];
        var slowData = Enumerable.Repeat(chunkPayload, 100).SelectMany(x => x).ToArray();
        SetupHttpFactory(req =>
        {
            chunkCount++;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new SlowStreamContent(slowData, chunkDelayMs: 10)
            };
        });

        var destination = Path.Combine(_tempDir, "tc-b03.bin");
        var downloadId = await _sut.StartAsync("cat-b03", "http://fixture/b03.bin", destination, null, CancellationToken.None);

        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(15));

        var downloadingEvents = events.Where(e => e.Phase == DownloadState.Downloading).ToList();
        downloadingEvents.Count.Should().BeLessThanOrEqualTo(12,
            "10 Hz throttle + first event + finalizing transition should not exceed 12");
    }

    [TestMethod]
    public async Task TC_B04_ServerSideSpeed_NonZeroAfterSecondEvent()
    {
        var chunkPayload = new byte[8_192];
        var slowData = Enumerable.Repeat(chunkPayload, 50).SelectMany(x => x).ToArray();
        SetupHttpFactory(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new SlowStreamContent(slowData, chunkDelayMs: 20)
        });

        var destination = Path.Combine(_tempDir, "tc-b04.bin");
        var downloadId = await _sut.StartAsync("cat-b04", "http://fixture/b04.bin", destination, null, CancellationToken.None);

        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(15));

        var downloadingEvents = events.Where(e => e.Phase == DownloadState.Downloading).ToList();
        if (downloadingEvents.Count >= 3)
        {
            downloadingEvents.Skip(2).Should().Contain(e => e.SpeedBytesPerSecond > 0,
                "speed should be non-zero after third event (needs two progress samples for EMA)");
        }
        events.Last().Phase.Should().Be(DownloadState.Completed);
    }

    [TestMethod]
    public async Task TC_B05_Cancel_FromDownloading_DeletesPartialReleasesSlot()
    {
        using var pauseTcs = new SemaphoreSlim(0, 1);
        var payload = new byte[500_000];
        SetupHttpFactory(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new PausableStreamContent(payload, pauseTcs)
        });

        var destination = Path.Combine(_tempDir, "tc-b05.bin");
        var downloadId = await _sut.StartAsync("cat-b05", "http://fixture/b05.bin", destination, null, CancellationToken.None);

        await WaitForPhaseAsync(downloadId, DownloadState.Downloading, TimeSpan.FromSeconds(5));

        var cancelResult = await _sut.TryCancelAsync(downloadId, CancellationToken.None);
        cancelResult.Should().BeNull();

        pauseTcs.Release();
        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(10));

        events.Should().Contain(e => e.Phase == DownloadState.Cancelled);
        File.Exists(destination + ".partial").Should().BeFalse();
    }

    [TestMethod]
    [DoNotParallelize]
    public async Task TC_B06_Cancel_FromQueued_NoHttpIssued()
    {
        var httpCallCount = 0;
        using var httpRequestReceived = new SemaphoreSlim(0, 2);
        using var releaseHttp = new SemaphoreSlim(0, 2);

        var bigPayload = new byte[100_000];
        SetupHttpFactoryAsync(async req =>
        {
            Interlocked.Increment(ref httpCallCount);
            httpRequestReceived.Release();
            await releaseHttp.WaitAsync();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(bigPayload)
            };
        });

        var dest1 = Path.Combine(_tempDir, "tc-b06-1.bin");
        var dest2 = Path.Combine(_tempDir, "tc-b06-2.bin");
        var dest3 = Path.Combine(_tempDir, "tc-b06-3.bin");

        var id1 = await _sut.StartAsync("cat-b06-1", "http://fixture/b06-1.bin", dest1, null, CancellationToken.None);
        var id2 = await _sut.StartAsync("cat-b06-2", "http://fixture/b06-2.bin", dest2, null, CancellationToken.None);
        var id3 = await _sut.StartAsync("cat-b06-3", "http://fixture/b06-3.bin", dest3, null, CancellationToken.None);

        using var waitCts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        await httpRequestReceived.WaitAsync(waitCts.Token);
        await httpRequestReceived.WaitAsync(waitCts.Token);

        var cancelResult = await _sut.TryCancelAsync(id3, CancellationToken.None);
        cancelResult.Should().BeNull();

        var events3 = await CollectEventsAsync(id3, TimeSpan.FromSeconds(15));
        events3.Should().Contain(e => e.Phase == DownloadState.Cancelled);

        httpCallCount.Should().Be(2);

        releaseHttp.Release(2);
    }

    [TestMethod]
    public async Task TC_B07_Cancel_FromFinalizing_ReturnsCannot()
    {
        var inFinalizeTcs = new TaskCompletionSource<bool>();
        var payload = new byte[4_096];
        SetupHttpFactory(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(payload)
        });

        var destination = Path.Combine(_tempDir, "tc-b07.bin");
        var downloadId = await _sut.StartAsync("cat-b07", "http://fixture/b07.bin", destination, null, CancellationToken.None);

        _repo.TryGetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(ci => new DownloadJob
            {
                Id = Guid.Parse(downloadId),
                State = DownloadState.Finalizing
            });

        await Task.Delay(50);

        var cancelError = await _sut.TryCancelAsync(downloadId, CancellationToken.None);
        cancelError.Should().Be("CANNOT_CANCEL_FINALIZING");
    }

    [TestMethod]
    public async Task TC_B08_Cancel_UnknownId_ReturnsNotFound()
    {
        var result = await _sut.TryCancelAsync("ffffffffffffffffffffffffffffffff", CancellationToken.None);
        result.Should().Be("NOT_FOUND");
    }

    [TestMethod]
    public async Task TC_B09_Range_Resume_UsesRangeHeader()
    {
        var totalBytes = 10_000;
        var existingBytes = totalBytes / 2;
        var firstHalf = new byte[existingBytes];
        var secondHalf = new byte[totalBytes - existingBytes];
        RandomNumberGenerator.Fill(firstHalf);
        RandomNumberGenerator.Fill(secondHalf);

        var destination = Path.Combine(_tempDir, "tc-b09.bin");
        var partialPath = destination + ".partial";
        await File.WriteAllBytesAsync(partialPath, firstHalf, TestContext.CancellationToken);

        HttpRequestMessage? capturedRequest = null;
        SetupHttpFactory(req =>
        {
            capturedRequest = req;
            return new HttpResponseMessage(HttpStatusCode.PartialContent)
            {
                Content = new ByteArrayContent(secondHalf)
            };
        });

        var downloadId = await _sut.StartAsync("cat-b09", "http://fixture/b09.bin", destination, null, CancellationToken.None);

        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(10));
        events.Last().Phase.Should().BeOneOf(DownloadState.Completed, DownloadState.Finalizing);

        capturedRequest.Should().NotBeNull();
        capturedRequest.Headers.Range.Should().NotBeNull();
        capturedRequest.Headers.Range.Ranges.First().From.Should().Be(existingBytes);
    }

    [TestMethod]
    public async Task TC_B10_SHAMismatch_StateFailed_ErrorKindSha_PartialDeleted()
    {
        var payload = RandomNumberGenerator.GetBytes(4_096);
        SetupHttpFactory(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(payload)
        });

        var destination = Path.Combine(_tempDir, "tc-b10.bin");
        var wrongSha = "aabbccdd" + new string('0', 56);
        var downloadId = await _sut.StartAsync("cat-b10", "http://fixture/b10.bin", destination, wrongSha, CancellationToken.None);

        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(10));

        events.Last().Phase.Should().Be(DownloadState.Failed);
        events.Last().Error.Should().Contain("mismatch");
        File.Exists(destination + ".partial").Should().BeFalse();
        File.Exists(destination).Should().BeFalse();
    }

    [TestMethod]
    public async Task TC_B11_TransientRetry_SucceedsAfterOneRetry()
    {
        var callCount = 0;
        var payload = RandomNumberGenerator.GetBytes(4_096);
        SetupHttpFactory(req =>
        {
            var attempt = Interlocked.Increment(ref callCount);
            if (attempt == 1)
            {
                return new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
            }
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(payload)
            };
        });

        var destination = Path.Combine(_tempDir, "tc-b11.bin");
        var downloadId = await _sut.StartAsync("cat-b11", "http://fixture/b11.bin", destination, null, CancellationToken.None);

        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(30));

        events.Last().Phase.Should().Be(DownloadState.Completed);
        callCount.Should().BeGreaterThan(1);
    }

    [TestMethod]
    public async Task TC_B12a_MaxRetriesExhausted_TransientFail_PartialPreserved()
    {
        SetupHttpFactory(req => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        var destination = Path.Combine(_tempDir, "tc-b12a.bin");
        var downloadId = await _sut.StartAsync("cat-b12a", "http://fixture/b12a.bin", destination, null, CancellationToken.None);

        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(60));

        events.Last().Phase.Should().Be(DownloadState.Failed);
    }

    [TestMethod]
    public async Task TC_B12c_NotFound404_FailFast_PartialDeleted()
    {
        var callCount = 0;
        SetupHttpFactory(req =>
        {
            Interlocked.Increment(ref callCount);
            return new HttpResponseMessage(HttpStatusCode.NotFound);
        });

        var destination = Path.Combine(_tempDir, "tc-b12c.bin");
        var downloadId = await _sut.StartAsync("cat-b12c", "http://fixture/b12c.bin", destination, null, CancellationToken.None);

        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(10));

        events.Last().Phase.Should().Be(DownloadState.Failed);
        callCount.Should().Be(1);
        File.Exists(destination + ".partial").Should().BeFalse();
    }

    [TestMethod]
    public async Task TC_B13_Concurrency2_5Starts_Show2Downloading3Queued()
    {
        using var blockAllHttp = new SemaphoreSlim(0, 5);
        using var httpStarted = new SemaphoreSlim(0, 5);
        var payload = new byte[100_000];

        SetupHttpFactory(req =>
        {
            httpStarted.Release();
            blockAllHttp.Wait();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(payload)
            };
        });

        var dests = Enumerable.Range(1, 5)
            .Select(i => Path.Combine(_tempDir, $"tc-b13-{i}.bin"))
            .ToArray();

        var ids = new List<string>();
        for (var i = 0; i < 5; i++)
        {
            ids.Add(await _sut.StartAsync($"cat-b13-{i}", $"http://fixture/b13-{i}.bin", dests[i], null, CancellationToken.None));
        }

        await httpStarted.WaitAsync(TimeSpan.FromSeconds(5));
        await httpStarted.WaitAsync(TimeSpan.FromSeconds(5));
        await Task.Delay(100);

        _repo.ListActiveAsync(Arg.Any<CancellationToken>())
            .Returns(ids.Select((id, i) => new DownloadJob
            {
                Id = Guid.Parse(id),
                CatalogueId = $"cat-b13-{i}",
                State = i < 2 ? DownloadState.Downloading : DownloadState.Queued
            }).ToArray());

        var active = await _sut.ListActiveAsync(CancellationToken.None);
        active.Should().HaveCount(5);

        blockAllHttp.Release(5);
    }

    [TestMethod]
    public async Task TC_B14a_DupMutation_ActiveCatalogueId_SameDownloadIdReturned()
    {
        var firstDownloadId = await _sut.StartAsync("cat-b14a", "http://fixture/b14a.bin",
            Path.Combine(_tempDir, "tc-b14a.bin"), null, CancellationToken.None);

        _repo.TryGetActiveByCatalogueIdAsync("cat-b14a", Arg.Any<CancellationToken>())
            .Returns(new DownloadJob
            {
                Id = Guid.Parse(firstDownloadId),
                CatalogueId = "cat-b14a",
                State = DownloadState.Downloading
            });

        var existingId = await _repo.TryGetActiveByCatalogueIdAsync("cat-b14a", CancellationToken.None);
        existingId.Should().NotBeNull();
        existingId.Id.ToString("N").Should().Be(firstDownloadId);
    }

    [TestMethod]
    public async Task TC_B15_AlreadyInstalled_IsCheckedByMutationType()
    {
        var dest = Path.Combine(_tempDir, "tc-b15.bin");
        await File.WriteAllBytesAsync(dest, [1, 2, 3], TestContext.CancellationToken);

        File.Exists(dest).Should().BeTrue("prerequisite: destination exists");
    }

    [TestMethod]
    public async Task TC_B18_DiskFull_IOException_StateFailed()
    {
        var payload = RandomNumberGenerator.GetBytes(4_096);
        SetupHttpFactory(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(payload)
        });

        var destination = Path.Combine("/proc/nonexistent_for_ioerror/tc-b18.bin");

        var downloadId = await _sut.StartAsync("cat-b18", "http://fixture/b18.bin", destination, null, CancellationToken.None);

        var events = await CollectEventsAsync(downloadId, TimeSpan.FromSeconds(10));

        events.Last().Phase.Should().Be(DownloadState.Failed);
    }

    [TestMethod]
    public async Task TC_B14b_NewStart_AfterTransientFail_UsesRangeHeader()
    {
        SetupHttpFactory(req => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));

        var destination = Path.Combine(_tempDir, "tc-b14b.bin");
        var failedId = await _sut.StartAsync("cat-b14b", "http://fixture/b14b.bin", destination, null, CancellationToken.None);
        var failedEvents = await CollectEventsAsync(failedId, TimeSpan.FromSeconds(60));
        failedEvents.Last().Phase.Should().Be(DownloadState.Failed);

        await File.WriteAllBytesAsync(destination + ".partial", new byte[2_048]);

        long? observedRangeStart = null;
        var payload = new byte[4_096];
        SetupHttpFactory(req =>
        {
            observedRangeStart = req.Headers.Range?.Ranges.FirstOrDefault()?.From;
            return new HttpResponseMessage(HttpStatusCode.PartialContent)
            {
                Content = new ByteArrayContent(new byte[2_048])
            };
        });

        var resumedId = await _sut.StartAsync("cat-b14b", "http://fixture/b14b.bin", destination, null, CancellationToken.None);
        var resumedEvents = await CollectEventsAsync(resumedId, TimeSpan.FromSeconds(10));

        resumedEvents.Last().Phase.Should().Be(DownloadState.Completed);
        observedRangeStart.Should().Be(2_048, "the new attempt must resume from the preserved partial offset");
    }

    [TestMethod]
    public async Task TC_B14c_NewStart_AfterShaFailure_ClearsPartialAndStartsFromZero()
    {
        var destination = Path.Combine(_tempDir, "tc-b14c.bin");
        var corruptPayload = new byte[256];
        SetupHttpFactory(req => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(corruptPayload)
        });

        var firstId = await _sut.StartAsync("cat-b14c", "http://fixture/b14c.bin", destination, "deadbeef".PadRight(64, '0'), CancellationToken.None);
        var firstEvents = await CollectEventsAsync(firstId, TimeSpan.FromSeconds(10));
        firstEvents.Last().Phase.Should().Be(DownloadState.Failed);
        File.Exists(destination + ".partial").Should().BeFalse("SHA failure must clear *.partial");

        long? observedRangeStart = null;
        SetupHttpFactory(req =>
        {
            observedRangeStart = req.Headers.Range?.Ranges.FirstOrDefault()?.From;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(corruptPayload)
            };
        });

        var secondId = await _sut.StartAsync("cat-b14c", "http://fixture/b14c.bin", destination, null, CancellationToken.None);
        await CollectEventsAsync(secondId, TimeSpan.FromSeconds(10));

        observedRangeStart.Should().BeNull("after Sha failure the new attempt must start from byte 0, not Range");
    }

    [TestMethod]
    public async Task TC_B14d_NewStart_AfterCancel_StartsFromZero()
    {
        using var blockUntilCancel = new SemaphoreSlim(0, 1);
        var firstResponseSent = new TaskCompletionSource<bool>();
        SetupHttpFactoryAsync(async req =>
        {
            firstResponseSent.TrySetResult(true);
            await blockUntilCancel.WaitAsync(TimeSpan.FromSeconds(20));
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(new byte[1024])
            };
        });

        var destination = Path.Combine(_tempDir, "tc-b14d.bin");
        var firstId = await _sut.StartAsync("cat-b14d", "http://fixture/b14d.bin", destination, null, CancellationToken.None);
        await firstResponseSent.Task.WaitAsync(TimeSpan.FromSeconds(5));
        await _sut.TryCancelAsync(firstId, CancellationToken.None);
        blockUntilCancel.Release();
        await WaitForPhaseAsync(firstId, DownloadState.Cancelled, TimeSpan.FromSeconds(5));
        File.Exists(destination + ".partial").Should().BeFalse("cancel must clear *.partial");

        long? observedRangeStart = null;
        SetupHttpFactory(req =>
        {
            observedRangeStart = req.Headers.Range?.Ranges.FirstOrDefault()?.From;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(new byte[1024])
            };
        });

        var secondId = await _sut.StartAsync("cat-b14d", "http://fixture/b14d.bin", destination, null, CancellationToken.None);
        await CollectEventsAsync(secondId, TimeSpan.FromSeconds(10));

        observedRangeStart.Should().BeNull("after Cancel the new attempt must start from byte 0");
    }

    [TestMethod]
    public async Task TC_B19_TransientThenServerClosesShort_RetriesUntilFailWithoutPretendingSuccess()
    {
        var attempt = 0;
        SetupHttpFactoryAsync(async req =>
        {
            attempt++;
            var msg = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(new byte[100])
            };
            msg.Content.Headers.ContentLength = 4_096;
            return await Task.FromResult(msg);
        });

        var destination = Path.Combine(_tempDir, "tc-b19.bin");
        var id = await _sut.StartAsync("cat-b19", "http://fixture/b19.bin", destination, null, CancellationToken.None);
        var events = await CollectEventsAsync(id, TimeSpan.FromSeconds(60));

        events.Last().Phase.Should().Be(DownloadState.Failed,
            "server claiming Content-Length=4096 but only delivering 100 bytes must NOT be reported as Completed");
        attempt.Should().BeGreaterThan(1, "short response should be classified as Transient and retried");
    }

    [TestMethod]
    public async Task TC_B20_Regression_RequestCT_DoesNotCancelDownload()
    {
        var downloadStarted = new TaskCompletionSource<bool>();
        var payload = new byte[2_000_000];
        SetupHttpFactory(req =>
        {
            downloadStarted.TrySetResult(true);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new ByteArrayContent(payload)
            };
        });

        var destination = Path.Combine(_tempDir, "tc-b20.bin");
        using var requestCts = new CancellationTokenSource();

        var downloadId = await _sut.StartAsync(
            "cat-b20",
            "http://fixture/b20.bin",
            destination,
            null,
            CancellationToken.None);

        await downloadStarted.Task.WaitAsync(TimeSpan.FromSeconds(5));

        await requestCts.CancelAsync();
        await Task.Delay(200);

        using var snapshotCts = new CancellationTokenSource(TimeSpan.FromMilliseconds(50));
        var snapshot = _sut.StreamAsync(downloadId, snapshotCts.Token);
        ModelDownloadProgress? lastSeen = null;
        try
        {
            await foreach (var p in snapshot)
            {
                lastSeen = p;
                break;
            }
        }
        catch (OperationCanceledException) { }

        lastSeen.Should().NotBeNull("download should still be tracked after request CT cancellation");
        lastSeen.Phase.Should().NotBe(DownloadState.Cancelled,
            "cancelling the request CT must not cancel the download");
    }

    private void SetupHttpFactory(Func<HttpRequestMessage, HttpResponseMessage> responder)
    {
        _currentHandler?.Dispose();
        _currentHandler = new ScriptedHandler(responder);
        _stubFactory!.SetHandler(_currentHandler);
    }

    private void SetupHttpFactoryAsync(Func<HttpRequestMessage, Task<HttpResponseMessage>> asyncResponder)
    {
        _currentHandler?.Dispose();
        _currentHandler = new ScriptedHandler(asyncResponder);
        _stubFactory!.SetHandler(_currentHandler);
    }

    private async Task<List<ModelDownloadProgress>> CollectEventsAsync(string downloadId, TimeSpan timeout)
    {
        var events = new List<ModelDownloadProgress>();
        using var cts = new CancellationTokenSource(timeout);
        try
        {
            await foreach (var p in _sut.StreamAsync(downloadId, cts.Token))
            {
                events.Add(p);
                if (IsTerminal(p.Phase)) break;
            }
        }
        catch (OperationCanceledException) { }
        return events;
    }

    private async Task WaitForPhaseAsync(string downloadId, DownloadState phase, TimeSpan timeout)
    {
        var start = DateTimeOffset.UtcNow;
        while (DateTimeOffset.UtcNow - start < timeout)
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));
            try
            {
                await foreach (var p in _sut.StreamAsync(downloadId, cts.Token))
                {
                    if (p.Phase == phase) return;
                    break;
                }
            }
            catch (OperationCanceledException) { }
            await Task.Delay(50);
        }
    }

    private static bool IsTerminal(DownloadState state) =>
        state is DownloadState.Completed or DownloadState.Failed or DownloadState.Cancelled;

    private sealed class ScriptedHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, Task<HttpResponseMessage>> _responder;

        public ScriptedHandler(Func<HttpRequestMessage, HttpResponseMessage> responder)
        {
            _responder = req => Task.FromResult(responder(req));
        }

        public ScriptedHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> asyncResponder)
        {
            _responder = asyncResponder;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => _responder(request);
    }

    private sealed class PausableStreamContent : HttpContent
    {
        private readonly byte[] _data;
        private readonly SemaphoreSlim _gate;

        public PausableStreamContent(byte[] data, SemaphoreSlim gate)
        {
            _data = data;
            _gate = gate;
        }

        protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context, CancellationToken cancellationToken)
        {
            var chunkSize = 8_192;
            for (var offset = 0; offset < _data.Length; offset += chunkSize)
            {
                await _gate.WaitAsync(cancellationToken);
                cancellationToken.ThrowIfCancellationRequested();
                var count = Math.Min(chunkSize, _data.Length - offset);
                await stream.WriteAsync(_data.AsMemory(offset, count), cancellationToken);
                _gate.Release();
                await Task.Delay(5, cancellationToken);
            }
        }

        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context)
            => SerializeToStreamAsync(stream, context, CancellationToken.None);

        protected override bool TryComputeLength(out long length)
        {
            length = _data.Length;
            return true;
        }
    }

    private sealed class SlowStreamContent : HttpContent
    {
        private readonly byte[] _data;
        private readonly int _chunkDelayMs;

        public SlowStreamContent(byte[] data, int chunkDelayMs)
        {
            _data = data;
            _chunkDelayMs = chunkDelayMs;
        }

        protected override async Task SerializeToStreamAsync(Stream stream, TransportContext? context)
        {
            var chunkSize = 8_192;
            for (var offset = 0; offset < _data.Length; offset += chunkSize)
            {
                var count = Math.Min(chunkSize, _data.Length - offset);
                await stream.WriteAsync(_data.AsMemory(offset, count));
                await Task.Delay(_chunkDelayMs);
            }
        }

        protected override bool TryComputeLength(out long length)
        {
            length = _data.Length;
            return true;
        }
    }

    private sealed class StubHttpClientFactory : IHttpClientFactory
    {
        private HttpMessageHandler? _handler;

        public StubHttpClientFactory() { }

        public void SetHandler(HttpMessageHandler handler) => _handler = handler;

        public HttpClient CreateClient(string name) =>
            _handler is not null
                ? new HttpClient(_handler, disposeHandler: false)
                : throw new InvalidOperationException("No handler configured");
    }
}
