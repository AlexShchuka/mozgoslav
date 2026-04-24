using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Infrastructure.Services;

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
