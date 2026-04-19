using System;
using System.IO;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Domain.Services;

/// <summary>
/// Deterministic SHA-256 hashing used for idempotent Recording import.
/// </summary>
public static class HashCalculator
{
    public static async Task<string> Sha256Async(string filePath, CancellationToken ct = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(filePath);

        await using var stream = File.OpenRead(filePath);
        return await Sha256Async(stream, ct);
    }

    public static async Task<string> Sha256Async(Stream stream, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(stream);

        using var sha = SHA256.Create();
        var hash = await sha.ComputeHashAsync(stream, ct);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
