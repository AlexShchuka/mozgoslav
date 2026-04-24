using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Mozgoslav.Infrastructure.Services;

public sealed record ModelDownloadProgress(
    string DownloadId,
    long BytesRead,
    long? TotalBytes,
    bool Done,
    string? Error);

public interface IModelDownloadCoordinator
{
    string Start(string catalogueId, string url, string destinationPath, CancellationToken ct);

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
