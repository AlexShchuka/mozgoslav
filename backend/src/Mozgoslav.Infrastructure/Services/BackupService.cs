using System.Globalization;
using System.IO.Compression;

using Microsoft.Extensions.Logging;

using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Creates a timestamped ZIP snapshot of the app data directory
/// (<see cref="AppPaths.Root"/>) — database, settings, models-metadata. Logs are
/// excluded to keep the archive small; vault content is the user's responsibility
/// and lives outside our directory.
/// <para>
/// TODO-9 — .NET 10's <c>ZipFile</c> API still does not expose
/// <c>OpenAsync</c>, so the actual compression loop runs on a background
/// thread via <see cref="Task.Run(System.Action,System.Threading.CancellationToken)"/>.
/// This keeps the calling request thread free while hundreds of megabytes are
/// compressed, and avoids the <c>CA1849</c> pragma the previous revision
/// needed. The cancellation token is observed before the background task
/// starts and is re-checked inside <see cref="AddDirectory"/> for each file.
/// </para>
/// </summary>
public sealed class BackupService
{
    private readonly ILogger<BackupService> _logger;

    public BackupService(ILogger<BackupService> logger)
    {
        _logger = logger;
    }

    public async Task<string> CreateAsync(CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        AppPaths.EnsureExist();
        var backupsDir = Path.Combine(AppPaths.Root, "backups");
        Directory.CreateDirectory(backupsDir);

        var stamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHHmmss", CultureInfo.InvariantCulture);
        var destination = Path.Combine(backupsDir, $"mozgoslav-backup-{stamp}.zip");

        if (File.Exists(destination))
        {
            File.Delete(destination);
        }

        // Off-threadpool IO — the ZipFile API is synchronous and .NET 10 has no
        // ZipFile.OpenAsync. Task.Run keeps the request thread free; the token
        // is observed on every file so a cancel short-circuits the archive.
        await Task.Run(() =>
        {
            using var archive = ZipFile.Open(destination, ZipArchiveMode.Create);
            AddIfExists(archive, AppPaths.Database, "mozgoslav.db");
            AddDirectory(archive, AppPaths.Models, "models", ct);
            AddDirectory(archive, Path.Combine(AppPaths.Root, "config"), "config", ct);
        }, ct);

        _logger.LogInformation("Created backup at {Path}", destination);
        return destination;
    }

    public IReadOnlyList<FileInfo> List()
    {
        var backupsDir = Path.Combine(AppPaths.Root, "backups");
        if (!Directory.Exists(backupsDir))
        {
            return [];
        }
        return new DirectoryInfo(backupsDir)
            .GetFiles("*.zip")
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .ToArray();
    }

    private static void AddIfExists(ZipArchive archive, string path, string entryName)
    {
        if (File.Exists(path))
        {
            archive.CreateEntryFromFile(path, entryName, CompressionLevel.Optimal);
        }
    }

    private static void AddDirectory(ZipArchive archive, string dir, string entryPrefix, CancellationToken ct)
    {
        if (!Directory.Exists(dir))
        {
            return;
        }
        foreach (var file in Directory.EnumerateFiles(dir, "*", SearchOption.AllDirectories))
        {
            ct.ThrowIfCancellationRequested();
            var rel = Path.GetRelativePath(dir, file);
            var entry = Path.Combine(entryPrefix, rel).Replace('\\', '/');
            archive.CreateEntryFromFile(file, entry, CompressionLevel.Optimal);
        }
    }
}
