using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Infrastructure.Platform;
using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Infrastructure;

/// <summary>
/// TODO-9 — <c>BackupService</c> drives a one-click SQLite backup. The work
/// must happen on a background thread (no synchronous ZipFile call under a
/// <c>#pragma warning disable CA1849</c>) so the caller's request thread is
/// not blocked while we compress hundreds of megabytes.
/// <para>
/// NOTE: AppPaths is a static; we are exercising the real app-data root here.
/// Tests seed and clean up the files they create under <see cref="AppPaths.Database"/>
/// and <see cref="AppPaths.Models"/> so repeated runs stay deterministic.
/// </para>
/// </summary>
[TestClass]
[DoNotParallelize]
public sealed class BackupServiceTests
{
    private readonly List<string> _seededFiles = [];
    private readonly List<string> _seededDirs = [];
    private readonly List<string> _producedBackups = [];

    [TestCleanup]
    public void Cleanup()
    {
        foreach (var backup in _producedBackups)
        {
            TryDeleteFile(backup);
        }
        foreach (var file in _seededFiles)
        {
            TryDeleteFile(file);
        }
        foreach (var dir in _seededDirs)
        {
            TryDeleteDirectory(dir);
        }
        _producedBackups.Clear();
        _seededFiles.Clear();
        _seededDirs.Clear();
    }

    [TestMethod]
    public async Task CreateAsync_ReturnsDestinationPath()
    {
        var svc = new BackupService(NullLogger<BackupService>.Instance);

        var path = await svc.CreateAsync(CancellationToken.None);
        _producedBackups.Add(path);

        path.Should().NotBeNullOrEmpty();
        File.Exists(path).Should().BeTrue();
        Path.GetFileName(path).Should().StartWith("mozgoslav-backup-").And.EndWith(".zip");
    }

    [TestMethod]
    public async Task CreateAsync_IncludesSqliteSnapshot()
    {
        AppPaths.EnsureExist();
        var dbAlreadyExisted = File.Exists(AppPaths.Database);
        if (!dbAlreadyExisted)
        {
            await File.WriteAllTextAsync(AppPaths.Database, "SQLITE-SNAPSHOT-STUB");
            _seededFiles.Add(AppPaths.Database);
        }

        var svc = new BackupService(NullLogger<BackupService>.Instance);
        var path = await svc.CreateAsync(CancellationToken.None);
        _producedBackups.Add(path);

        await using var fileStream = File.OpenRead(path);
        await using var archive = new ZipArchive(fileStream, ZipArchiveMode.Read);
        archive.Entries.Should().Contain(e => e.FullName == "mozgoslav.db");
    }

    [TestMethod]
    public async Task CreateAsync_HonoursCancellation()
    {
        AppPaths.EnsureExist();

        var scratchDir = Path.Combine(AppPaths.Models, "backup-cancel-probe-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(scratchDir);
        _seededDirs.Add(scratchDir);
        for (var i = 0; i < 8; i++)
        {
            await File.WriteAllTextAsync(Path.Combine(scratchDir, $"f{i}.bin"), new string('x', 1024));
        }

        var svc = new BackupService(NullLogger<BackupService>.Instance);
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        var act = async () => await svc.CreateAsync(cts.Token);
        await act.Should().ThrowAsync<OperationCanceledException>();
    }

    private static void TryDeleteFile(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }
    }

    private static void TryDeleteDirectory(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Directory.Delete(path, recursive: true);
            }
        }
        catch (IOException)
        {
        }
        catch (UnauthorizedAccessException)
        {
        }
    }
}
