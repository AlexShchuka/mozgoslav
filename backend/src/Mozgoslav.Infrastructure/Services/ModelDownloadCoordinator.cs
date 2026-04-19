using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Progress event for an async model download (ADR-007-shared §2.3).
/// A terminal event is one where <see cref="Done"/> is true; subscribers may
/// then close the SSE stream client-side.
/// </summary>
public sealed record ModelDownloadProgress(
    string DownloadId,
    long BytesRead,
    long? TotalBytes,
    bool Done,
    string? Error);

/// <summary>
/// Orchestrates asynchronous model downloads (BC-034, bug 1/2 follow-up). A
/// caller invokes <see cref="Start"/> with a catalogue id and receives a
/// <c>downloadId</c> immediately; the actual HTTP transfer runs in the
/// background and publishes <see cref="ModelDownloadProgress"/> records onto
/// a per-download channel. <see cref="StreamAsync"/> replays any existing
/// progress for late subscribers and then fans out subsequent events.
/// </summary>
public interface IModelDownloadCoordinator
{
    /// <summary>
    /// Starts a background download for the given catalogue id. Returns the
    /// download id used to subscribe via <see cref="StreamAsync"/>.
    /// </summary>
    /// <param name="catalogueId">Canonical catalogue id or alias.</param>
    /// <param name="url">Source URL resolved from the catalogue.</param>
    /// <param name="destinationPath">Filesystem destination (under <see cref="AppPaths.Models"/>).</param>
    /// <param name="ct">Cancellation token for the host shutdown.</param>
    string Start(string catalogueId, string url, string destinationPath, CancellationToken ct);

    /// <summary>
    /// Streams progress events for a specific download. Completes when the
    /// download itself completes (success, error, or unknown id).
    /// </summary>
    IAsyncEnumerable<ModelDownloadProgress> StreamAsync(string downloadId, CancellationToken ct);
}

public sealed class ModelDownloadCoordinator : IModelDownloadCoordinator, IDisposable
{
    private readonly ModelDownloadService _downloader;
    private readonly ILogger<ModelDownloadCoordinator> _logger;
    private readonly ConcurrentDictionary<string, DownloadState> _downloads = new();
    private readonly CancellationToken _hostStopping;

    public ModelDownloadCoordinator(
        ModelDownloadService downloader,
        ILogger<ModelDownloadCoordinator> logger,
        IHostApplicationLifetime lifetime)
    {
        _downloader = downloader;
        _logger = logger;
        _hostStopping = lifetime.ApplicationStopping;
    }

    public string Start(string catalogueId, string url, string destinationPath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(catalogueId);
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        ArgumentException.ThrowIfNullOrWhiteSpace(destinationPath);

        var downloadId = Guid.NewGuid().ToString("N");
        var channel = Channel.CreateUnbounded<ModelDownloadProgress>(new UnboundedChannelOptions
        {
            SingleReader = false,
            SingleWriter = true
        });
        var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(ct, _hostStopping);
        var state = new DownloadState(channel, linkedCts);
        _downloads[downloadId] = state;

        _ = Task.Run(() => RunAsync(downloadId, url, destinationPath, linkedCts.Token), linkedCts.Token);
        _logger.LogInformation("Queued model download {DownloadId} for {CatalogueId}", downloadId, catalogueId);
        return downloadId;
    }

    public async IAsyncEnumerable<ModelDownloadProgress> StreamAsync(
        string downloadId,
        [EnumeratorCancellation] CancellationToken ct)
    {
        if (!_downloads.TryGetValue(downloadId, out var state))
        {
            yield return new ModelDownloadProgress(downloadId, 0, null, Done: true, Error: "unknown-download-id");
            yield break;
        }

        await foreach (var progress in state.Channel.Reader.ReadAllAsync(ct))
        {
            yield return progress;
            if (progress.Done)
            {
                yield break;
            }
        }
    }

    private async Task RunAsync(string downloadId, string url, string destinationPath, CancellationToken ct)
    {
        if (!_downloads.TryGetValue(downloadId, out var state))
        {
            return;
        }

        var progressReporter = new Progress<ModelDownloadService.Progress>(p =>
        {
            _ = state.Channel.Writer.TryWrite(new ModelDownloadProgress(
                downloadId,
                p.BytesReceived,
                p.TotalBytes,
                Done: false,
                Error: null));
        });

        try
        {
            await _downloader.DownloadAsync(url, destinationPath, progressReporter, ct);
            _ = state.Channel.Writer.TryWrite(new ModelDownloadProgress(
                downloadId,
                BytesRead: 0,
                TotalBytes: null,
                Done: true,
                Error: null));
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            _ = state.Channel.Writer.TryWrite(new ModelDownloadProgress(
                downloadId,
                BytesRead: 0,
                TotalBytes: null,
                Done: true,
                Error: "cancelled"));
        }
        catch (ObjectDisposedException)
        {
            _ = state.Channel.Writer.TryWrite(new ModelDownloadProgress(
                downloadId,
                BytesRead: 0,
                TotalBytes: null,
                Done: true,
                Error: "cancelled"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Model download {DownloadId} failed", downloadId);
            _ = state.Channel.Writer.TryWrite(new ModelDownloadProgress(
                downloadId,
                BytesRead: 0,
                TotalBytes: null,
                Done: true,
                Error: ex.Message));
        }
        finally
        {
            state.Channel.Writer.TryComplete();
        }
    }

    public void Dispose()
    {
        foreach (var state in _downloads.Values)
        {
            state.Cts.Cancel();
            state.Channel.Writer.TryComplete();
            state.Cts.Dispose();
        }
        _downloads.Clear();
    }

    private sealed class DownloadState
    {
        public Channel<ModelDownloadProgress> Channel { get; }
        public CancellationTokenSource Cts { get; }

        public DownloadState(Channel<ModelDownloadProgress> channel, CancellationTokenSource cts)
        {
            Channel = channel;
            Cts = cts;
        }
    }
}
