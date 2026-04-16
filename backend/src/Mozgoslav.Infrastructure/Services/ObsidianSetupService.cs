using Microsoft.Extensions.Logging;

namespace Mozgoslav.Infrastructure.Services;

/// <summary>
/// Prepares an Obsidian vault for Mozgoslav use: creates the expected folder
/// structure (inbox + aggregation folders), drops a Templater-style note template,
/// and writes a minimal <c>.obsidian/plugins</c> hint file. Idempotent: existing
/// files are preserved untouched.
/// </summary>
public sealed class ObsidianSetupService
{
    public record SetupReport(string VaultPath, IReadOnlyList<string> CreatedPaths, IReadOnlyList<string> SkippedPaths);

    private readonly ILogger<ObsidianSetupService> _logger;

    public ObsidianSetupService(ILogger<ObsidianSetupService> logger)
    {
        _logger = logger;
    }

    private static readonly string[] Folders = [
        "_inbox",
        "People",
        "Projects",
        "Topics",
        "Templates",
    ];

    private const string TemplateFileName = "Mozgoslav Conversation.md";

    private const string TemplateBody = """
        ---
        type: conversation
        profile: <% tp.system.prompt("Profile") %>
        date: <% tp.date.now("YYYY-MM-DD") %>
        duration: ""
        topic: ""
        conversation_type: meeting
        participants: []
        tags: []
        source_audio: ""
        processing_version: 1
        ---

        ## Summary

        ## Ключевые тезисы

        ## Решения

        ## Action Items

        ## Вопросы без ответа

        ## Участники

        ## Clean Transcript

        ## Full Transcript
        """;

    public async Task<SetupReport> SetupAsync(string vaultPath, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(vaultPath);
        Directory.CreateDirectory(vaultPath);

        var created = new List<string>();
        var skipped = new List<string>();

        foreach (var folder in Folders)
        {
            var full = Path.Combine(vaultPath, folder);
            if (Directory.Exists(full))
            {
                skipped.Add(full);
            }
            else
            {
                Directory.CreateDirectory(full);
                created.Add(full);
            }
            ct.ThrowIfCancellationRequested();
        }

        var templatePath = Path.Combine(vaultPath, "Templates", TemplateFileName);
        if (File.Exists(templatePath))
        {
            skipped.Add(templatePath);
        }
        else
        {
            await File.WriteAllTextAsync(templatePath, TemplateBody, ct);
            created.Add(templatePath);
        }

        _logger.LogInformation("Obsidian vault prepared at {Vault}: {Created} new, {Skipped} existing",
            vaultPath, created.Count, skipped.Count);

        return new SetupReport(vaultPath, created, skipped);
    }
}
