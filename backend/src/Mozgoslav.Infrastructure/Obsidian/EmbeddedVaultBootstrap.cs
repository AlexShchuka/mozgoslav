#pragma warning disable IDISP004
using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text.Json;
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
        return Task.FromResult(RequireResourceStream(embeddedResourceKey));
    }

    private IReadOnlyList<BootstrapManifestEntry> LoadManifest()
    {
        using var stream = RequireResourceStream(ManifestResourceKey);
        using var doc = JsonDocument.Parse(stream);
        var files = doc.RootElement.GetProperty("files");
        var entries = new List<BootstrapManifestEntry>(files.GetArrayLength());
        foreach (var entry in files.EnumerateArray())
        {
            var vaultRelativePath = entry.GetProperty("vaultRelativePath").GetString()
                ?? throw new InvalidDataException("manifest.json entry missing vaultRelativePath");
            var resourceKey = entry.GetProperty("embeddedResourceKey").GetString()
                ?? throw new InvalidDataException("manifest.json entry missing embeddedResourceKey");
            var sha = entry.GetProperty("sha256").GetString()
                ?? throw new InvalidDataException("manifest.json entry missing sha256");
            var policyName = entry.GetProperty("writePolicy").GetString()
                ?? throw new InvalidDataException("manifest.json entry missing writePolicy");
            if (!Enum.TryParse<WritePolicy>(policyName, ignoreCase: true, out var policy))
            {
                throw new InvalidDataException($"manifest.json entry has unknown writePolicy '{policyName}'");
            }
            entries.Add(new BootstrapManifestEntry(vaultRelativePath, resourceKey, sha, policy));
        }
        return entries;
    }

    private Stream RequireResourceStream(string key)
    {
        var stream = _assembly.GetManifestResourceStream(key);
        return stream ?? throw new FileNotFoundException($"Embedded bootstrap resource not found: {key}");
    }
}
