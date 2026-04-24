using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Infrastructure.Obsidian;

public static class PinnedPluginsLoader
{
    private const string ResourceKey = "Mozgoslav.Infrastructure.Resources.ObsidianBootstrap.pinned-plugins.json";
    private static readonly JsonSerializerOptions PinnedJson = new(JsonSerializerDefaults.Web);

    public static IReadOnlyList<PluginInstallSpec> LoadFromEmbeddedResource()
    {
        return Load(typeof(PinnedPluginsLoader).Assembly);
    }

    internal static IReadOnlyList<PluginInstallSpec> Load(Assembly assembly)
    {
        var bytes = ReadBytes(assembly);
        var dto = JsonSerializer.Deserialize<PinnedPluginsDto>(bytes, PinnedJson)
            ?? throw new InvalidDataException("pinned-plugins.json failed to deserialize");

        var plugins = new List<PluginInstallSpec>(dto.Plugins.Count);
        foreach (var plugin in dto.Plugins)
        {
            var assets = new List<PluginAssetSpec>(plugin.Assets.Count);
            foreach (var asset in plugin.Assets)
            {
                assets.Add(new PluginAssetSpec(asset.Name, asset.Sha256, asset.Dest, asset.Optional));
            }
            plugins.Add(new PluginInstallSpec(plugin.Id, plugin.Owner, plugin.Repo, plugin.Tag, assets));
        }
        return plugins;
    }

    private static byte[] ReadBytes(Assembly assembly)
    {
        var names = assembly.GetManifestResourceNames();
        if (Array.IndexOf(names, ResourceKey) < 0)
        {
            throw new FileNotFoundException($"Pinned-plugins resource missing: {ResourceKey}");
        }
        using var stream = assembly.GetManifestResourceStream(ResourceKey)!;
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return buffer.ToArray();
    }

    private sealed record PinnedPluginsDto(
        [property: JsonPropertyName("plugins")] IReadOnlyList<PluginDto> Plugins);

    private sealed record PluginDto(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("owner")] string Owner,
        [property: JsonPropertyName("repo")] string Repo,
        [property: JsonPropertyName("tag")] string Tag,
        [property: JsonPropertyName("assets")] IReadOnlyList<AssetDto> Assets);

    private sealed record AssetDto(
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("sha256")] string Sha256,
        [property: JsonPropertyName("dest")] string Dest,
        [property: JsonPropertyName("optional")] bool Optional = false);
}
