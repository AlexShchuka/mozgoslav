using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Search.Tools;

public sealed class ObsidianReadTool
{
    public const string ToolName = "obsidian.read";

    private readonly IAppSettings _settings;
    private readonly ILogger<ObsidianReadTool> _logger;

    public ObsidianReadTool(IAppSettings settings, ILogger<ObsidianReadTool> logger)
    {
        _settings = settings;
        _logger = logger;
    }

    public async Task<string> ExecuteAsync(string path, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        var loaded = await _settings.LoadAsync(ct);
        var vaultRoot = loaded.VaultPath;
        if (string.IsNullOrWhiteSpace(vaultRoot))
        {
            _logger.LogWarning("obsidian.read: vault path not configured");
            return string.Empty;
        }
        var fullPath = Path.Combine(vaultRoot, path.TrimStart('/', '\\'));
        if (!File.Exists(fullPath))
        {
            _logger.LogWarning("obsidian.read: file not found {Path}", fullPath);
            return string.Empty;
        }
        var content = await File.ReadAllTextAsync(fullPath, ct);
        _logger.LogInformation("obsidian.read fetched {Len} chars from {Path}", content.Length, path);
        return content;
    }

    public static JsonNode BuildToolSpec()
    {
        return JsonNode.Parse(JsonSerializer.Serialize(new
        {
            name = ToolName,
            description = "Read a vault note by its vault-relative path. Use when the user explicitly asks about a specific note.",
            parameters = new
            {
                type = "object",
                properties = new
                {
                    path = new { type = "string" },
                },
                required = new[] { "path" },
            },
        }))!;
    }
}
