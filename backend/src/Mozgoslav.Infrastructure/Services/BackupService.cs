using System.IO.Compression;
using Microsoft.Extensions.Logging;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Creates a timestamped ZIP snapshot of the app data directory
/// (<see cref="AppPaths.Root"/>) — database, settings, models-metadata. Logs are
/// excluded to keep the archive small; vault content is the user's responsibility
/// and lives outside our directory.
/// </summary>
public sealed class BackupService
{
    private readonly ILogger<BackupService> _logger;

    public BackupService(ILogger<BackupService> logger)
    {
        _logger = logger;
    }

    public Task<string> CreateAsync(CancellationToken ct)
    {
        AppPaths.EnsureExist();
        var backupsDir = Path.Combine(AppPaths.Root, "backups");
        Directory.CreateDirectory(backupsDir);

        var stamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHHmmss");
        var destination = Path.Combine(backupsDir, $"mozgoslav-backup-{stamp}.zip");

        if (File.Exists(destination))
        {
            File.Delete(destination);
        }

        using (var archive = ZipFile.Open(destination, ZipArchiveMode.Create))
        {
            AddIfExists(archive, AppPaths.Database, "mozgoslav.db");
            AddDirectory(archive, AppPaths.Models, "models", ct);
            AddDirectory(archive, Path.Combine(AppPaths.Root, "config"), "config", ct);
        }

        _logger.LogInformation("Created backup at {Path}", destination);
        return Task.FromResult(destination);
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
