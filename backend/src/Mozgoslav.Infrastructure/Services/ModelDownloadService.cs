using System;
using System.IO;
using System.Net.Http;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

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

    public async Task<string> DownloadAsync(
        string url,
        string destinationPath,
        IProgress<Progress>? progress,
        CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        ArgumentException.ThrowIfNullOrWhiteSpace(destinationPath);

        AppPaths.EnsureExist();
        Directory.CreateDirectory(Path.GetDirectoryName(destinationPath)!);

        var tempPath = destinationPath + ".tmp";
        if (File.Exists(tempPath))
        {
            File.Delete(tempPath);
        }

        using var client = _httpClientFactory.CreateClient("models");

        using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct);
        response.EnsureSuccessStatusCode();

        var total = response.Content.Headers.ContentLength;
        await using var source = await response.Content.ReadAsStreamAsync(ct);
        long received = 0;
        await using (var target = File.Create(tempPath))
        {
            var buffer = new byte[81_920];
            int read;
            while ((read = await source.ReadAsync(buffer, ct)) > 0)
            {
                await target.WriteAsync(buffer.AsMemory(0, read), ct);
                received += read;
                var percent = total.HasValue && total.Value > 0
                    ? (int)(100d * received / total.Value)
                    : -1;
                progress?.Report(new Progress(received, total, percent));
            }
        }

        progress?.Report(new Progress(received, total, 100));

        File.Move(tempPath, destinationPath, overwrite: true);
        _logger.LogInformation("Downloaded {Url} → {Path}", url, destinationPath);
        return destinationPath;
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
}
