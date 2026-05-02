using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Services;

public sealed class ModelDownloadService
{
    public record Progress(long BytesReceived, long? TotalBytes, int Percent);

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ModelDownloadService> _logger;

    public ModelDownloadService(
        IHttpClientFactory httpClientFactory,
        ILogger<ModelDownloadService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<DownloadErrorKind?> DownloadAsync(
        string url,
        string destinationPath,
        long resumeFrom,
        IProgress<Progress>? progress,
        CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        ArgumentException.ThrowIfNullOrWhiteSpace(destinationPath);

        AppPaths.EnsureExist();
        Directory.CreateDirectory(Path.GetDirectoryName(destinationPath)!);

        var partialPath = destinationPath + ".partial";

        using var client = _httpClientFactory.CreateClient("models");

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (resumeFrom > 0)
        {
            request.Headers.Range = new RangeHeaderValue(resumeFrom, null);
        }

        HttpResponseMessage response;
        try
        {
            response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);
        }
        catch (HttpRequestException ex) when (IsTransientException(ex))
        {
            _logger.LogWarning(ex, "Transient HTTP error downloading {Url}", url);
            return DownloadErrorKind.Transient;
        }
        catch (TaskCanceledException ex) when (!ct.IsCancellationRequested)
        {
            _logger.LogWarning(ex, "Timeout downloading {Url}", url);
            return DownloadErrorKind.Transient;
        }

        if (response.StatusCode == HttpStatusCode.NotFound || response.StatusCode == HttpStatusCode.Gone)
        {
            response.Dispose();
            return DownloadErrorKind.NotFound;
        }

        if ((int)response.StatusCode >= 400 && (int)response.StatusCode < 500)
        {
            var code = (int)response.StatusCode;
            response.Dispose();
            _logger.LogWarning("Non-transient HTTP {Status} downloading {Url}", code, url);
            return DownloadErrorKind.Unknown;
        }

        if ((int)response.StatusCode >= 500)
        {
            response.Dispose();
            return DownloadErrorKind.Transient;
        }

        using (response)
        {
            var total = response.Content.Headers.ContentLength;
            var effectiveTotal = total.HasValue ? resumeFrom + total.Value : 0;

            await using var source = await response.Content.ReadAsStreamAsync(ct);

            var fileMode = resumeFrom > 0 ? FileMode.Append : FileMode.Create;
            var received = resumeFrom;

            await using (var target = new FileStream(partialPath, fileMode, FileAccess.Write, FileShare.None))
            {
                var buffer = new byte[81_920];
                int read;
                while ((read = await source.ReadAsync(buffer, ct)) > 0)
                {
                    await target.WriteAsync(buffer.AsMemory(0, read), ct);
                    received += read;
                    var pct = effectiveTotal > 0 ? (int)(100d * received / effectiveTotal) : -1;
                    progress?.Report(new Progress(received, effectiveTotal > 0 ? effectiveTotal : null, pct));
                }
            }

            if (effectiveTotal > 0 && received < effectiveTotal)
            {
                _logger.LogWarning(
                    "Download of {Url} ended before TotalBytes: got {Received}, expected {Expected}",
                    url, received, effectiveTotal);
                return DownloadErrorKind.Transient;
            }

            if (effectiveTotal > 0)
            {
                progress?.Report(new Progress(received, effectiveTotal, 100));
            }
        }

        return null;
    }

    public static Task MovePartialToDestinationAsync(string destinationPath)
    {
        var partialPath = destinationPath + ".partial";
        if (File.Exists(partialPath))
        {
            File.Move(partialPath, destinationPath, overwrite: true);
        }
        return Task.CompletedTask;
    }

    public static async Task<string?> ComputeSha256Async(string path, CancellationToken ct)
    {
        if (!File.Exists(path))
        {
            return null;
        }
        await using var stream = File.OpenRead(path);
        var hash = await SHA256.HashDataAsync(stream, ct);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    public static long GetPartialSize(string destinationPath)
    {
        var partialPath = destinationPath + ".partial";
        if (!File.Exists(partialPath)) return 0;
        return new FileInfo(partialPath).Length;
    }

    public static void DeletePartial(string destinationPath)
    {
        var partialPath = destinationPath + ".partial";
        if (File.Exists(partialPath))
        {
            File.Delete(partialPath);
        }
    }

    private static bool IsTransientException(HttpRequestException ex)
    {
        if (ex.StatusCode.HasValue)
        {
            return (int)ex.StatusCode.Value >= 500;
        }
        return true;
    }
}
