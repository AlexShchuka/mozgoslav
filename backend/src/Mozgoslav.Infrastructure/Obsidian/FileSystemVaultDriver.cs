using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Infrastructure.Obsidian;

public sealed class FileSystemVaultDriver : IVaultDriver
{
    private const string BackupFolder = ".mozgoslav";
    private const string BackupSubdir = "bootstrap-backups";

    private readonly IAppSettings _settings;
    private readonly IVaultBootstrapProvider _bootstrap;
    private readonly ILogger<FileSystemVaultDriver> _logger;

    public FileSystemVaultDriver(
        IAppSettings settings,
        IVaultBootstrapProvider bootstrap,
        ILogger<FileSystemVaultDriver> logger)
    {
        _settings = settings;
        _bootstrap = bootstrap;
        _logger = logger;
    }

    public async Task EnsureVaultPreparedAsync(VaultProvisioningSpec spec, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(spec);
        ArgumentException.ThrowIfNullOrWhiteSpace(spec.VaultRoot);

        Directory.CreateDirectory(spec.VaultRoot);
        var backupStamp = DateTimeOffset.UtcNow.ToString("yyyyMMddTHHmmssfffZ");
        string? backupRoot = null;

        foreach (var file in spec.Files)
        {
            ct.ThrowIfCancellationRequested();
            var absolute = ResolveSafeAbsolutePath(spec.VaultRoot, file.VaultRelativePath);
            var exists = File.Exists(absolute);

            switch (file.WritePolicy)
            {
                case WritePolicy.UserOwned when exists:
                case WritePolicy.CreateIfMissing when exists:
                    continue;
                case WritePolicy.UserOwned:
                case WritePolicy.CreateIfMissing:
                    await WriteFromEmbeddedAsync(file, absolute, ct);
                    continue;
                case WritePolicy.Overwrite:
                    break;
                default:
                    throw new InvalidOperationException($"Unknown write policy: {file.WritePolicy}");
            }

            if (exists)
            {
                var onDiskSha = await ComputeSha256Async(absolute, ct);
                if (string.Equals(onDiskSha, file.Sha256, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }
                backupRoot ??= Path.Combine(spec.VaultRoot, BackupFolder, BackupSubdir, backupStamp);
                await BackupFileAsync(absolute, spec.VaultRoot, backupRoot, ct);
            }

            await WriteFromEmbeddedAsync(file, absolute, ct);
        }

        _logger.LogInformation("Vault prepared at {Vault}: {Count} files processed", spec.VaultRoot, spec.Files.Count);
    }

    public async Task<VaultWriteReceipt> WriteNoteAsync(VaultNoteWrite write, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(write);
        ArgumentException.ThrowIfNullOrWhiteSpace(write.VaultRelativePath);
        var vaultRoot = RequireVaultRoot();
        var absolute = ResolveSafeAbsolutePath(vaultRoot, write.VaultRelativePath);
        var directory = Path.GetDirectoryName(absolute);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }
        var existed = File.Exists(absolute);
        var bytes = Encoding.UTF8.GetBytes(write.Body);
        await WriteAtomicAsync(absolute, bytes, ct);
        var sha = ComputeSha256(bytes);
        var action = existed ? VaultWriteAction.Overwrote : VaultWriteAction.Created;
        return new VaultWriteReceipt(write.VaultRelativePath, sha, bytes.LongLength, action);
    }

    public Task EnsureFolderAsync(string vaultRelativePath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(vaultRelativePath);
        ct.ThrowIfCancellationRequested();
        var vaultRoot = RequireVaultRoot();
        var absolute = ResolveSafeAbsolutePath(vaultRoot, vaultRelativePath);
        Directory.CreateDirectory(absolute);
        return Task.CompletedTask;
    }

    private string RequireVaultRoot()
    {
        var root = _settings.VaultPath;
        if (string.IsNullOrWhiteSpace(root))
        {
            throw new InvalidOperationException("Vault path is not configured");
        }
        return root;
    }

    internal static string ResolveSafeAbsolutePath(string vaultRoot, string vaultRelativePath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(vaultRoot);
        ArgumentException.ThrowIfNullOrWhiteSpace(vaultRelativePath);
        var normalized = vaultRelativePath.Replace('\\', '/').TrimStart('/');
        var vaultFull = Path.GetFullPath(vaultRoot);
        var candidate = Path.GetFullPath(Path.Combine(vaultFull, normalized));
        var vaultPrefix = vaultFull.EndsWith(Path.DirectorySeparatorChar) ? vaultFull : vaultFull + Path.DirectorySeparatorChar;
        if (!candidate.StartsWith(vaultPrefix, StringComparison.Ordinal) && candidate != vaultFull)
        {
            throw new InvalidOperationException(
                $"Rejected path escape outside vault root: '{vaultRelativePath}' -> '{candidate}'");
        }
        return candidate;
    }

    private async Task WriteFromEmbeddedAsync(BootstrapFileSpec file, string absolute, CancellationToken ct)
    {
        var directory = Path.GetDirectoryName(absolute);
        if (!string.IsNullOrEmpty(directory))
        {
            Directory.CreateDirectory(directory);
        }
        using var source = await _bootstrap.OpenReadAsync(file.EmbeddedResourceKey, ct);
        using var buffer = new MemoryStream();
        await source.CopyToAsync(buffer, ct);
        var bytes = buffer.ToArray();
        await WriteAtomicAsync(absolute, bytes, ct);
    }

    private static async Task WriteAtomicAsync(string absolute, byte[] bytes, CancellationToken ct)
    {
        var temp = absolute + ".tmp";
        await File.WriteAllBytesAsync(temp, bytes, ct);
        File.Move(temp, absolute, overwrite: true);
    }

    private static async Task BackupFileAsync(string absolute, string vaultRoot, string backupRoot, CancellationToken ct)
    {
        var vaultFull = Path.GetFullPath(vaultRoot);
        var relative = Path.GetRelativePath(vaultFull, absolute).Replace('\\', '/');
        var backupPath = Path.Combine(backupRoot, relative);
        var backupDir = Path.GetDirectoryName(backupPath);
        if (!string.IsNullOrEmpty(backupDir))
        {
            Directory.CreateDirectory(backupDir);
        }
        await using var src = File.OpenRead(absolute);
        await using var dst = File.Create(backupPath);
        await src.CopyToAsync(dst, ct);
    }

    private static async Task<string> ComputeSha256Async(string path, CancellationToken ct)
    {
        await using var stream = File.OpenRead(path);
        using var sha = SHA256.Create();
        var hash = await sha.ComputeHashAsync(stream, ct);
        return ToHex(hash);
    }

    private static string ComputeSha256(byte[] bytes)
    {
        var hash = SHA256.HashData(bytes);
        return ToHex(hash);
    }

    private static string ToHex(byte[] bytes)
    {
        var sb = new StringBuilder(bytes.Length * 2);
        foreach (var b in bytes)
        {
            sb.Append(b.ToString("X2", System.Globalization.CultureInfo.InvariantCulture));
        }
        return sb.ToString();
    }
}
