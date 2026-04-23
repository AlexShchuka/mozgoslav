using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Infrastructure.Obsidian;

/// <summary>
/// ADR-019 §5.9 — reads the build-time-generated <c>manifest.json</c> +
/// streams individual bootstrap files from embedded resources inside
/// <c>Mozgoslav.Infrastructure</c>. Hash-verified on read: the caller may
/// compare the stream's SHA-256 against <see cref="BootstrapManifestEntry.Sha256"/>.
/// </summary>
public sealed class EmbeddedVaultBootstrap : IVaultBootstrapProvider
{
    private const string ManifestResourceKey = "Mozgoslav.Infrastructure.Resources.ObsidianBootstrap.manifest.json";
    private static readonly JsonSerializerOptions ManifestJson = new(JsonSerializerDefaults.Web);

    private readonly Assembly _assembly;
    private readonly Lazy<IReadOnlyList<BootstrapManifestEntry>> _manifest;

    public EmbeddedVaultBootstrap()
        : this(typeof(EmbeddedVaultBootstrap).Assembly)
    {
    }

    internal EmbeddedVaultBootstrap(Assembly assembly)
    {
        _assembly = assembly;
        _manifest = new Lazy<IReadOnlyList<BootstrapManifestEntry>>(LoadManifest, LazyThreadSafetyMode.ExecutionAndPublication);
    }

    public IReadOnlyList<BootstrapManifestEntry> Manifest => _manifest.Value;

    public Task<Stream> OpenReadAsync(string embeddedResourceKey, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(embeddedResourceKey);
        ct.ThrowIfCancellationRequested();
        var bytes = ReadResourceBytes(embeddedResourceKey);
        return Task.FromResult<Stream>(new MemoryStream(bytes, writable: false));
    }

    private IReadOnlyList<BootstrapManifestEntry> LoadManifest()
    {
        var bytes = ReadResourceBytes(ManifestResourceKey);
        var dto = JsonSerializer.Deserialize<ManifestDto>(bytes, ManifestJson)
            ?? throw new InvalidDataException("Bootstrap manifest.json failed to deserialize");
        var entries = new List<BootstrapManifestEntry>(dto.Files.Count);
        foreach (var file in dto.Files)
        {
            if (!Enum.TryParse<WritePolicy>(file.WritePolicy, ignoreCase: true, out var policy))
            {
                throw new InvalidDataException($"manifest.json entry has unknown writePolicy '{file.WritePolicy}'");
            }
            entries.Add(new BootstrapManifestEntry(file.VaultRelativePath, file.EmbeddedResourceKey, file.Sha256, policy));
        }
        return entries;
    }

    private byte[] ReadResourceBytes(string key)
    {
        var names = _assembly.GetManifestResourceNames();
        if (!names.Contains(key))
        {
            throw new FileNotFoundException($"Embedded bootstrap resource not found: {key}");
        }
        using var stream = _assembly.GetManifestResourceStream(key)!;
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }

    private sealed record ManifestDto(
        [property: JsonPropertyName("files")] IReadOnlyList<ManifestFileDto> Files);

    private sealed record ManifestFileDto(
        [property: JsonPropertyName("vaultRelativePath")] string VaultRelativePath,
        [property: JsonPropertyName("embeddedResourceKey")] string EmbeddedResourceKey,
        [property: JsonPropertyName("sha256")] string Sha256,
        [property: JsonPropertyName("writePolicy")] string WritePolicy);
}
