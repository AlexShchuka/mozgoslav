using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Observability;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Infrastructure.Services;

public sealed record ModelDownloadProgress(
    string DownloadId,
    long BytesRead,
    long? TotalBytes,
    DownloadState Phase,
    double? SpeedBytesPerSecond,
    string? Error);

public sealed record ActiveDownloadSnapshot(
    string Id,
    string CatalogueId,
    DownloadState State,
    long BytesReceived,
    long? TotalBytes,
    double? SpeedBytesPerSecond,
    string? ErrorMessage,
    DateTimeOffset? StartedAt);

public interface IModelDownloadCoordinator
{
    Task<string> StartAsync(string catalogueId, string url, string destinationPath, string? expectedSha256, CancellationToken appStopping);

    Task<string?> TryCancelAsync(string downloadId, CancellationToken ct);

    IAsyncEnumerable<ModelDownloadProgress> StreamAsync(string downloadId, CancellationToken ct);

    Task<IReadOnlyList<ActiveDownloadSnapshot>> ListActiveAsync(CancellationToken ct);
}

public sealed class ModelDownloadCoordinatorOptions
{
    public const string SectionName = "Mozgoslav:Downloads";
    public int MaxConcurrentDownloads { get; set; } = 2;
    public int MaxRetries { get; set; } = 5;
}

public sealed class ModelDownloadCoordinator : IModelDownloadCoordinator, IDisposable
{
    private sealed class SpeedCalculator
    {
        private const int WindowSize = 10;
        private readonly (DateTimeOffset Timestamp, long Bytes)[] _samples = new (DateTimeOffset, long)[WindowSize];
        private int _head;
        private int _count;
        private double _ema;

        public double Update(long totalReceived)
        {
            var now = DateTimeOffset.UtcNow;
            var oldestIndex = (_head + 1) % WindowSize;
            if (_count >= 2)
            {
                var oldest = _samples[oldestIndex];
                var elapsed = (now - oldest.Timestamp).TotalSeconds;
                if (elapsed > 0)
                {
                    var instantSpeed = (totalReceived - oldest.Bytes) / elapsed;
                    _ema = _count < WindowSize ? instantSpeed : 0.1 * instantSpeed + 0.9 * _ema;
                }
            }
            _samples[_head] = (now, totalReceived);
            _head = (_head + 1) % WindowSize;
            if (_count < WindowSize) _count++;
            return _ema;
        }
    }

    private sealed class DownloadSlot
    {
        public Channel<ModelDownloadProgress> Channel { get; }
        public CancellationTokenSource Cts { get; }
        public ModelDownloadProgress? LastProgress { get; set; }
        public string CatalogueId { get; }

        public DownloadSlot(string catalogueId, CancellationTokenSource cts)
        {
            CatalogueId = catalogueId;
            Cts = cts;
            Channel = System.Threading.Channels.Channel.CreateUnbounded<ModelDownloadProgress>(
                new UnboundedChannelOptions { SingleReader = false, SingleWriter = true });
        }
    }

    private readonly ModelDownloadService _downloader;
    private readonly IDownloadJobRepository _repo;
    private readonly MozgoslavMetrics _metrics;
    private readonly ILogger<ModelDownloadCoordinator> _logger;
    private readonly ModelDownloadCoordinatorOptions _options;
    private readonly SemaphoreSlim _semaphore;
    private readonly ConcurrentDictionary<string, DownloadSlot> _slots = new();

    public ModelDownloadCoordinator(
        ModelDownloadService downloader,
        IDownloadJobRepository repo,
        MozgoslavMetrics metrics,
        IOptions<ModelDownloadCoordinatorOptions> options,
        ILogger<ModelDownloadCoordinator> logger)
    {
        _downloader = downloader;
        _repo = repo;
        _metrics = metrics;
        _options = options.Value;
        _logger = logger;
        _semaphore = new SemaphoreSlim(_options.MaxConcurrentDownloads, _options.MaxConcurrentDownloads);
    }

    public async Task<string> StartAsync(
        string catalogueId,
        string url,
        string destinationPath,
        string? expectedSha256,
        CancellationToken appStopping)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(catalogueId);
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        ArgumentException.ThrowIfNullOrWhiteSpace(destinationPath);

        var jobId = Guid.NewGuid();
        var downloadId = jobId.ToString("N");

        var job = new DownloadJob
        {
            Id = jobId,
            CatalogueId = catalogueId,
            SourceUrl = url,
            DestinationPath = destinationPath,
            ExpectedSha256 = expectedSha256,
            State = DownloadState.Queued,
            BytesReceived = 0,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await _repo.AddAsync(job, appStopping);
        _metrics.DownloadsStarted.Add(1, new System.Diagnostics.TagList { { "catalogue", catalogueId } });
        _metrics.DownloadsActive.Add(1);

        var cts = CancellationTokenSource.CreateLinkedTokenSource(appStopping);
        var slot = new DownloadSlot(catalogueId, cts);
        _slots[downloadId] = slot;

        var initialProgress = new ModelDownloadProgress(
            downloadId, 0, null, DownloadState.Queued, null, null);
        slot.LastProgress = initialProgress;
        slot.Channel.Writer.TryWrite(initialProgress);

        _ = Task.Run(() => RunJobAsync(downloadId, job, slot, cts.Token), CancellationToken.None);

        _logger.LogInformation("Queued model download {DownloadId} for {CatalogueId}", downloadId, catalogueId);
        return downloadId;
    }

    public async Task<string?> TryCancelAsync(string downloadId, CancellationToken ct)
    {
        if (!_slots.TryGetValue(downloadId, out var slot))
        {
            return "NOT_FOUND";
        }

        var job = await _repo.TryGetAsync(Guid.Parse(downloadId), ct);
        if (job is null) return "NOT_FOUND";

        if (job.State == DownloadState.Finalizing)
        {
            return "CANNOT_CANCEL_FINALIZING";
        }

        if (job.State is DownloadState.Completed or DownloadState.Failed or DownloadState.Cancelled)
        {
            return null;
        }

        await slot.Cts.CancelAsync();

        if (job.State == DownloadState.Queued)
        {
            EmitAndStore(slot, new ModelDownloadProgress(
                downloadId, 0, null, DownloadState.Cancelled, null, null));
            slot.Channel.Writer.TryComplete();
        }

        return null;
    }

    public async IAsyncEnumerable<ModelDownloadProgress> StreamAsync(
        string downloadId,
        [EnumeratorCancellation] CancellationToken ct)
    {
        if (!_slots.TryGetValue(downloadId, out var slot))
        {
            yield return new ModelDownloadProgress(
                downloadId, 0, null, DownloadState.Failed, null, "unknown-download-id");
            yield break;
        }

        var snapshot = slot.LastProgress;
        if (snapshot is not null)
        {
            yield return snapshot;
            if (IsTerminal(snapshot.Phase))
            {
                yield break;
            }
        }

        await foreach (var progress in slot.Channel.Reader.ReadAllAsync(ct))
        {
            yield return progress;
            if (IsTerminal(progress.Phase))
            {
                yield break;
            }
        }
    }

    public async Task<IReadOnlyList<ActiveDownloadSnapshot>> ListActiveAsync(CancellationToken ct)
    {
        var jobs = await _repo.ListActiveAsync(ct);
        return jobs.Select(j =>
        {
            _slots.TryGetValue(j.Id.ToString("N"), out var slot);
            var speed = slot?.LastProgress?.SpeedBytesPerSecond;
            return new ActiveDownloadSnapshot(
                j.Id.ToString("N"),
                j.CatalogueId,
                j.State,
                j.BytesReceived,
                j.TotalBytes,
                speed,
                j.ErrorMessage,
                j.StartedAt);
        }).ToList();
    }

    private async Task RunJobAsync(
        string downloadId,
        DownloadJob job,
        DownloadSlot slot,
        CancellationToken ct)
    {
        var startedAt = DateTimeOffset.UtcNow;
        var jobStopwatch = System.Diagnostics.Stopwatch.StartNew();

        try
        {
            await _semaphore.WaitAsync(ct);
        }
        catch (OperationCanceledException)
        {
            await TransitionAsync(job, DownloadState.Cancelled, null, null, null, CancellationToken.None);
            EmitAndStore(slot, new ModelDownloadProgress(
                downloadId, 0, null, DownloadState.Cancelled, null, null));
            slot.Channel.Writer.TryComplete();
            _metrics.DownloadsActive.Add(-1);
            return;
        }

        try
        {
            job.State = DownloadState.Downloading;
            job.StartedAt = startedAt;
            await _repo.UpdateAsync(job, CancellationToken.None);

            EmitAndStore(slot, new ModelDownloadProgress(
                downloadId, job.BytesReceived, job.TotalBytes, DownloadState.Downloading, null, null));

            var result = await RunWithRetryAsync(downloadId, job, slot, ct);

            if (result == RetryResult.Cancelled)
            {
                ModelDownloadService.DeletePartial(job.DestinationPath);
                await TransitionAsync(job, DownloadState.Cancelled, null, null, null, CancellationToken.None);
                EmitAndStore(slot, new ModelDownloadProgress(
                    downloadId, job.BytesReceived, job.TotalBytes, DownloadState.Cancelled, null, null));
                _metrics.DownloadsActive.Add(-1);
                return;
            }

            if (result == RetryResult.Failed)
            {
                _metrics.DownloadsActive.Add(-1);
                _metrics.DownloadsFailed.Add(1, new System.Diagnostics.TagList { { "kind", job.ErrorKind?.ToString() ?? "Unknown" } });
                return;
            }

            job.State = DownloadState.Finalizing;
            await _repo.UpdateAsync(job, CancellationToken.None);

            EmitAndStore(slot, new ModelDownloadProgress(
                downloadId, job.BytesReceived, job.TotalBytes, DownloadState.Finalizing, null, null));

            var finalizeResult = await FinalizeAsync(downloadId, job, slot);

            if (finalizeResult)
            {
                jobStopwatch.Stop();
                job.State = DownloadState.Completed;
                job.FinishedAt = DateTimeOffset.UtcNow;
                await _repo.UpdateAsync(job, CancellationToken.None);

                EmitAndStore(slot, new ModelDownloadProgress(
                    downloadId, job.BytesReceived, job.TotalBytes, DownloadState.Completed, null, null));
                _metrics.DownloadsCompleted.Add(1);
                _metrics.DownloadDuration.Record(jobStopwatch.Elapsed.TotalSeconds);
            }
            else
            {
                _metrics.DownloadsFailed.Add(1, new System.Diagnostics.TagList { { "kind", job.ErrorKind?.ToString() ?? "Unknown" } });
            }

            _metrics.DownloadsActive.Add(-1);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in RunJobAsync for {DownloadId}", downloadId);
            await TransitionAsync(job, DownloadState.Failed, DownloadErrorKind.Unknown, ex.Message, null, CancellationToken.None);
            EmitAndStore(slot, new ModelDownloadProgress(
                downloadId, job.BytesReceived, job.TotalBytes, DownloadState.Failed, null, ex.Message));
            ModelDownloadService.DeletePartial(job.DestinationPath);
            _metrics.DownloadsActive.Add(-1);
            _metrics.DownloadsFailed.Add(1, new System.Diagnostics.TagList { { "kind", "Unknown" } });
        }
        finally
        {
            _semaphore.Release();
            slot.Channel.Writer.TryComplete();
        }
    }

    private enum RetryResult
    {
        Success,
        Failed,
        Cancelled,
    }

    private async Task<RetryResult> RunWithRetryAsync(
        string downloadId,
        DownloadJob job,
        DownloadSlot slot,
        CancellationToken ct)
    {
        var maxRetries = _options.MaxRetries;
        var attempt = 0;
        var speedCalc = new SpeedCalculator();
        var lastEmit = DateTimeOffset.MinValue;
        var throttleInterval = TimeSpan.FromMilliseconds(100);

        while (attempt <= maxRetries)
        {
            if (ct.IsCancellationRequested) return RetryResult.Cancelled;

            if (attempt > 0)
            {
                var backoff = TimeSpan.FromSeconds(Math.Pow(2, attempt - 1));
                _logger.LogInformation(
                    "Retry attempt {Attempt}/{Max} for {DownloadId} after {Backoff}",
                    attempt, maxRetries, downloadId, backoff);
                try
                {
                    await Task.Delay(backoff, ct);
                }
                catch (OperationCanceledException)
                {
                    return RetryResult.Cancelled;
                }
            }

            var resumeFrom = ModelDownloadService.GetPartialSize(job.DestinationPath);

            var progressReporter = new Progress<ModelDownloadService.Progress>(p =>
            {
                var speed = speedCalc.Update(p.BytesReceived);
                job.BytesReceived = p.BytesReceived;
                job.TotalBytes = p.TotalBytes;

                var now = DateTimeOffset.UtcNow;
                if (now - lastEmit >= throttleInterval)
                {
                    lastEmit = now;
                    EmitAndStore(slot, new ModelDownloadProgress(
                        downloadId, p.BytesReceived, p.TotalBytes, DownloadState.Downloading, speed, null));
                }
            });

            DownloadErrorKind? errorKind;
            try
            {
                errorKind = await _downloader.DownloadAsync(
                    job.SourceUrl, job.DestinationPath, resumeFrom, progressReporter, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                return RetryResult.Cancelled;
            }
            catch (IOException ex)
            {
                _logger.LogError(ex, "IOException during download {DownloadId}", downloadId);
                await FailAndDeletePartialAsync(downloadId, job, slot, DownloadErrorKind.Unknown, ex.Message);
                return RetryResult.Failed;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during download {DownloadId}", downloadId);
                await FailAndDeletePartialAsync(downloadId, job, slot, DownloadErrorKind.Unknown, ex.Message);
                return RetryResult.Failed;
            }

            if (errorKind is null)
            {
                return RetryResult.Success;
            }

            if (errorKind == DownloadErrorKind.Transient)
            {
                attempt++;
                if (attempt > maxRetries)
                {
                    await TransitionAsync(job, DownloadState.Failed, DownloadErrorKind.Transient, "Max retries exceeded", null, CancellationToken.None);
                    EmitAndStore(slot, new ModelDownloadProgress(
                        downloadId, job.BytesReceived, job.TotalBytes, DownloadState.Failed, null, "Max retries exceeded"));
                    return RetryResult.Failed;
                }
                continue;
            }

            var errMsg = errorKind == DownloadErrorKind.NotFound ? "HTTP 404 Not Found" : "HTTP error";
            await FailAndDeletePartialAsync(downloadId, job, slot, errorKind.Value, errMsg);
            return RetryResult.Failed;
        }

        return RetryResult.Failed;
    }

    private async Task FailAndDeletePartialAsync(
        string downloadId,
        DownloadJob job,
        DownloadSlot slot,
        DownloadErrorKind errorKind,
        string errorMessage)
    {
        await TransitionAsync(job, DownloadState.Failed, errorKind, errorMessage, null, CancellationToken.None);
        EmitAndStore(slot, new ModelDownloadProgress(
            downloadId, job.BytesReceived, job.TotalBytes, DownloadState.Failed, null, errorMessage));
        ModelDownloadService.DeletePartial(job.DestinationPath);
    }

    private async Task<bool> FinalizeAsync(string downloadId, DownloadJob job, DownloadSlot slot)
    {
        try
        {
            await ModelDownloadService.MovePartialToDestinationAsync(job.DestinationPath);

            if (!string.IsNullOrWhiteSpace(job.ExpectedSha256))
            {
                var actualSha = await ModelDownloadService.ComputeSha256Async(
                    job.DestinationPath, CancellationToken.None);

                if (!string.Equals(actualSha, job.ExpectedSha256, StringComparison.OrdinalIgnoreCase))
                {
                    var msg = $"SHA256 mismatch: expected {job.ExpectedSha256}, actual {actualSha}";
                    _logger.LogError("{DownloadId}: {Message}", downloadId, msg);

                    if (File.Exists(job.DestinationPath))
                    {
                        File.Delete(job.DestinationPath);
                    }

                    await TransitionAsync(job, DownloadState.Failed, DownloadErrorKind.Sha, msg, null, CancellationToken.None);
                    EmitAndStore(slot, new ModelDownloadProgress(
                        downloadId, job.BytesReceived, job.TotalBytes, DownloadState.Failed, null, msg));
                    return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Finalize failed for {DownloadId}", downloadId);
            await TransitionAsync(job, DownloadState.Failed, DownloadErrorKind.Unknown, ex.Message, null, CancellationToken.None);
            EmitAndStore(slot, new ModelDownloadProgress(
                downloadId, job.BytesReceived, job.TotalBytes, DownloadState.Failed, null, ex.Message));
            ModelDownloadService.DeletePartial(job.DestinationPath);
            return false;
        }
    }

    private static void EmitAndStore(DownloadSlot slot, ModelDownloadProgress progress)
    {
        slot.LastProgress = progress;
        slot.Channel.Writer.TryWrite(progress);
    }

    private async Task TransitionAsync(
        DownloadJob job,
        DownloadState state,
        DownloadErrorKind? errorKind,
        string? errorMessage,
        DateTimeOffset? finishedAt,
        CancellationToken ct)
    {
        job.State = state;
        job.ErrorKind = errorKind;
        job.ErrorMessage = errorMessage;
        job.FinishedAt = finishedAt ?? (IsTerminal(state) ? DateTimeOffset.UtcNow : null);
        await _repo.UpdateAsync(job, ct);
    }

    private static bool IsTerminal(DownloadState state) =>
        state is DownloadState.Completed or DownloadState.Failed or DownloadState.Cancelled;

    public void Dispose()
    {
        foreach (var slot in _slots.Values)
        {
            slot.Cts.Cancel();
            slot.Channel.Writer.TryComplete();
            slot.Cts.Dispose();
        }
        _slots.Clear();
        _semaphore.Dispose();
    }
}
