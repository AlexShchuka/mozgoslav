using System;
using System.ComponentModel;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using ModelContextProtocol.Server;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Infrastructure.Mcp.Tools;

[McpServerToolType]
public sealed class ObsidianMcpTools
{
    private readonly IVaultDriver _vaultDriver;
    private readonly IAppSettings _settings;

    public ObsidianMcpTools(IVaultDriver vaultDriver, IAppSettings settings)
    {
        _vaultDriver = vaultDriver;
        _settings = settings;
    }

    [McpServerTool(Name = "obsidian.write")]
    [Description("Write markdown content to a file in the Obsidian vault. Creates or overwrites the file at the given vault-relative path.")]
    public async Task<ObsidianWriteResult> WriteAsync(
        [Description("Vault-relative path, e.g. _inbox/note.md")] string path,
        [Description("Markdown content to write")] string content,
        CancellationToken cancellationToken = default)
    {
        var write = new VaultNoteWrite(path, content);
        var receipt = await _vaultDriver.WriteNoteAsync(write, cancellationToken);
        return new ObsidianWriteResult(receipt.VaultRelativePath);
    }

    [McpServerTool(Name = "obsidian.read")]
    [Description("Read a file from the Obsidian vault. Returns its markdown content.")]
    public async Task<ObsidianReadResult> ReadAsync(
        [Description("Vault-relative path, e.g. _inbox/note.md")] string path,
        CancellationToken cancellationToken = default)
    {
        var vaultRoot = _settings.VaultPath;
        if (string.IsNullOrWhiteSpace(vaultRoot))
        {
            return new ObsidianReadResult(path, string.Empty, false);
        }

        var fullPath = Path.Combine(vaultRoot, path.TrimStart('/'));
        if (!File.Exists(fullPath))
        {
            return new ObsidianReadResult(path, string.Empty, false);
        }

        try
        {
            var text = await File.ReadAllTextAsync(fullPath, cancellationToken);
            return new ObsidianReadResult(path, text, true);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return new ObsidianReadResult(path, string.Empty, false);
        }
    }
}

public sealed record ObsidianWriteResult(string Path);
public sealed record ObsidianReadResult(string Path, string Content, bool Exists);
