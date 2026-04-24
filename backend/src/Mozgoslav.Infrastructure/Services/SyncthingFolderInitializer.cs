using System.IO;

using Microsoft.Extensions.Logging;

namespace Mozgoslav.Infrastructure.Services;

public sealed class SyncthingFolderInitializer
{
    private const string StignoreTemplate = """
        # System
        .DS_Store
        Thumbs.db
        desktop.ini
        ehthumbs.db

        # Partial / temp
        *.partial
        *.tmp
        *.swp
        *~

        # Obsidian workspace (user-specific state)
        .obsidian/workspace
        .obsidian/workspace.json
        .obsidian/workspace-mobile.json
        .obsidian/hotkeys.json
        .obsidian/plugins/*/data.json

        # Dev artifacts (if the vault overlaps with a dev folder)
        node_modules/
        .git/
        .gitignore

        # Trash
        .trash/
        .trashed-*
        """;

    private readonly string _recordingsPath;
    private readonly string _notesPath;
    private readonly string _vaultPath;
    private readonly ILogger<SyncthingFolderInitializer> _logger;

    public SyncthingFolderInitializer(
        string recordingsPath,
        string notesPath,
        string vaultPath,
        ILogger<SyncthingFolderInitializer> logger)
    {
        _recordingsPath = recordingsPath;
        _notesPath = notesPath;
        _vaultPath = vaultPath;
        _logger = logger;
    }

    public void Initialize()
    {
        EnsureFolderWithStignore(_recordingsPath);
        EnsureFolderWithStignore(_notesPath);

        if (!string.IsNullOrWhiteSpace(_vaultPath))
        {
            EnsureFolderWithStignore(_vaultPath);
        }
        else
        {
            _logger.LogInformation(
                "Obsidian vault path is empty; skipping vault folder bootstrap " +
                "(user can set it later via Settings → Obsidian)");
        }
    }

    private void EnsureFolderWithStignore(string folder)
    {
        if (!Directory.Exists(folder))
        {
            Directory.CreateDirectory(folder);
            _logger.LogInformation("Created sync folder {Folder}", folder);
        }

        var stignorePath = Path.Combine(folder, ".stignore");
        if (File.Exists(stignorePath))
        {
            return;
        }

        File.WriteAllText(stignorePath, StignoreTemplate);
        _logger.LogInformation("Seeded default .stignore at {Path}", stignorePath);
    }
}
