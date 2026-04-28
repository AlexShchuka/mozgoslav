using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Agents;
using Mozgoslav.Application.Agents.Skills;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Infrastructure.Agents.Skills;

public sealed class MafActionExtractorSkill : IActionExtractorSkill
{
    private const string ActionExampleJson =
        "[{\"title\":\"Send report to team\",\"due_iso\":null},{\"title\":\"Book flight\",\"due_iso\":\"2026-05-10\"}]";

    private const string ActionsSystemPrompt =
        "You are an action-item extraction assistant. " +
        "Given a note or meeting transcript, extract all action items. " +
        "For each action item output a JSON array element with fields: " +
        "\"title\" (string, the action description) and \"due_iso\" (string or null, due date in ISO 8601 if mentioned). " +
        "Output ONLY a valid JSON array, nothing else. Example: " + ActionExampleJson;

    private readonly IAgentRunner _agentRunner;
    private readonly IProcessedNoteRepository _notes;
    private readonly IVaultDriver _vaultDriver;
    private readonly IAppSettings _settings;
    private readonly IRemindersSkill _remindersSkill;
    private readonly ILogger<MafActionExtractorSkill> _logger;

    public MafActionExtractorSkill(
        IAgentRunner agentRunner,
        IProcessedNoteRepository notes,
        IVaultDriver vaultDriver,
        IAppSettings settings,
        IRemindersSkill remindersSkill,
        ILogger<MafActionExtractorSkill> logger)
    {
        _agentRunner = agentRunner;
        _notes = notes;
        _vaultDriver = vaultDriver;
        _settings = settings;
        _remindersSkill = remindersSkill;
        _logger = logger;
    }

    public async Task ExtractAsync(Guid noteId, CancellationToken ct)
    {
        var note = await _notes.GetByIdAsync(noteId, ct);
        if (note is null)
        {
            _logger.LogWarning("ActionExtractor: note {NoteId} not found", noteId);
            return;
        }

        var idempotencyPath = BuildIdempotencyPath(noteId);
        if (File.Exists(idempotencyPath))
        {
            _logger.LogInformation(
                "ActionExtractor: skipping note {NoteId} — already processed",
                noteId);
            return;
        }

        var prompt = $"Extract action items from this note:\n\n{note.MarkdownContent}";

        string rawOutput;
        try
        {
            var result = await _agentRunner.RunAsync(
                new AgentRunRequest(
                    Prompt: prompt,
                    SystemPrompt: ActionsSystemPrompt,
                    ToolNames: [],
                    ModelHint: null),
                ct);
            rawOutput = result.FinalAnswer;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "ActionExtractor: agent run failed for note {NoteId}", noteId);
            return;
        }

        var items = TryParseActionItems(rawOutput);
        if (items.Count == 0)
        {
            _logger.LogInformation("ActionExtractor: no action items found in note {NoteId}", noteId);
            MarkProcessed(idempotencyPath);
            return;
        }

        var markdown = BuildMarkdown(items, note.Title, noteId);
        var date = note.CreatedAt.ToString("yyyy-MM-dd");
        var slug = Slugify(note.Title);
        var vaultPath = $"_inbox/actions/{date}-{slug}.md";

        try
        {
            await _vaultDriver.WriteNoteAsync(new VaultNoteWrite(vaultPath, markdown), ct);
            _logger.LogInformation(
                "ActionExtractor: wrote {Count} items to {Path}",
                items.Count, vaultPath);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "ActionExtractor: vault write failed for note {NoteId}", noteId);
        }

        MarkProcessed(idempotencyPath);

        if (_settings.RemindersSkillEnabled && items.Count > 0)
        {
            try
            {
                await _remindersSkill.CreateAsync(items, ct);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "ActionExtractor: reminders creation failed for note {NoteId}", noteId);
            }
        }
    }

    private static IReadOnlyList<ActionItem> TryParseActionItems(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        var start = json.IndexOf('[', StringComparison.Ordinal);
        var end = json.LastIndexOf(']');
        if (start < 0 || end < 0 || end <= start)
        {
            return [];
        }

        var slice = json[start..(end + 1)];

        try
        {
            var result = new List<ActionItem>();
            using (var doc = JsonDocument.Parse(slice))
            {
                if (doc.RootElement.ValueKind == JsonValueKind.Array)
                {
                    using var enumerator = doc.RootElement.EnumerateArray();
                    while (enumerator.MoveNext())
                    {
                        var el = enumerator.Current;
                        var title = el.TryGetProperty("title", out var t) ? t.GetString() : null;
                        var due = el.TryGetProperty("due_iso", out var d) ? d.GetString() : null;
                        if (!string.IsNullOrWhiteSpace(title))
                        {
                            result.Add(new ActionItem(title, due));
                        }
                    }
                }
            }
            return result;
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string BuildMarkdown(
        IReadOnlyList<ActionItem> items,
        string noteTitle,
        Guid noteId)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"# Action Items — {noteTitle}");
        sb.AppendLine();
        sb.AppendLine($"Source note: {noteId:D}");
        sb.AppendLine();
        foreach (var item in items)
        {
            sb.Append($"- [ ] {item.Title}");
            if (!string.IsNullOrWhiteSpace(item.DueIso))
            {
                sb.Append($" (due: {item.DueIso})");
            }
            sb.AppendLine();
        }
        return sb.ToString();
    }

    private static string Slugify(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return "note";
        }
        var sb = new StringBuilder();
        foreach (var c in title.ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(c))
            {
                sb.Append(c);
            }
            else if (c == ' ' || c == '-' || c == '_')
            {
                sb.Append('-');
            }
        }
        var slug = sb.ToString().Trim('-');
        return slug.Length == 0 ? "note" : slug.Length > 50 ? slug[..50] : slug;
    }

    private string BuildIdempotencyPath(Guid noteId)
    {
        var dir = Path.Combine(Path.GetTempPath(), "mozgoslav-actions-processed");
        Directory.CreateDirectory(dir);
        return Path.Combine(dir, $"{noteId:D}.done");
    }

    private static void MarkProcessed(string path)
    {
        try
        {
            File.WriteAllText(path, DateTimeOffset.UtcNow.ToString("O"));
        }
        catch (Exception)
        {
        }
    }
}
