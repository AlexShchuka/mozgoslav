using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.UseCases;

public sealed class AggregateSummaryUseCase
{
    private const string SystemPrompt =
        "You are a note-taking assistant. " +
        "Merge the following meeting and conversation notes into a single cohesive summary. " +
        "Preserve key decisions, action items, and topics. " +
        "Write in clear, structured markdown.";

    private readonly IProcessedNoteRepository _notes;
    private readonly ILlmService _llm;
    private readonly IVaultDriver _vault;
    private readonly ILogger<AggregateSummaryUseCase> _logger;

    public AggregateSummaryUseCase(
        IProcessedNoteRepository notes,
        ILlmService llm,
        IVaultDriver vault,
        ILogger<AggregateSummaryUseCase> logger)
    {
        _notes = notes;
        _llm = llm;
        _vault = vault;
        _logger = logger;
    }

    public async Task ExecuteAsync(SummaryPeriod period, string vaultPath, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(vaultPath))
        {
            _logger.LogWarning("AggregateSummary: vaultPath is empty, skipping period {Label}", period.Label);
            return;
        }

        var inRange = (await _notes.GetByDateRangeAsync(period.From, period.To, ct)).ToList();

        if (inRange.Count == 0)
        {
            _logger.LogInformation("AggregateSummary: no notes in range for {Label}, skipping", period.Label);
            return;
        }

        _logger.LogInformation(
            "AggregateSummary: aggregating {Count} notes for period {Label}",
            inRange.Count,
            period.Label);

        var concatenated = BuildConcatenatedInput(inRange.Select(n => n.MarkdownContent));

        string body;
        if (await _llm.IsAvailableAsync(ct))
        {
            try
            {
                var result = await _llm.ProcessAsync(concatenated, SystemPrompt, ct);
                body = BuildMarkdownBody(period, result.Summary, result.KeyPoints, result.ActionItems, result.Tags);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogWarning(ex, "AggregateSummary: LLM failed, falling back to raw concatenation");
                body = BuildFallbackBody(period, concatenated);
            }
        }
        else
        {
            _logger.LogInformation("AggregateSummary: LLM unavailable, using raw concatenation for {Label}", period.Label);
            body = BuildFallbackBody(period, concatenated);
        }

        var outputFolder = "aggregated";
        var relativePath = $"{outputFolder}/{period.Label}.md";

        try
        {
            await _vault.EnsureFolderAsync(outputFolder, ct);
            await _vault.WriteNoteAsync(new VaultNoteWrite(relativePath, body), ct);
            _logger.LogInformation("AggregateSummary: wrote {Path}", relativePath);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "AggregateSummary: failed to write vault note for {Label}", period.Label);
        }
    }

    private static string BuildConcatenatedInput(IEnumerable<string> contents)
    {
        var sb = new StringBuilder();
        var index = 0;
        foreach (var content in contents)
        {
            if (!string.IsNullOrWhiteSpace(content))
            {
                index++;
                sb.AppendLine(CultureInfo.InvariantCulture, $"--- Note {index} ---");
                sb.AppendLine(content);
                sb.AppendLine();
            }
        }
        return sb.ToString();
    }

    private static string BuildMarkdownBody(
        SummaryPeriod period,
        string summary,
        IReadOnlyList<string> keyPoints,
        IReadOnlyList<ActionItem> actionItems,
        IReadOnlyList<string> tags)
    {
        var sb = new StringBuilder();
        sb.AppendLine(CultureInfo.InvariantCulture, $"# {period.Label}");
        sb.AppendLine();
        sb.AppendLine(CultureInfo.InvariantCulture, $"Period: {period.From:yyyy-MM-dd} – {period.To:yyyy-MM-dd}");
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(summary))
        {
            sb.AppendLine("## Summary");
            sb.AppendLine(summary);
            sb.AppendLine();
        }

        if (keyPoints.Count > 0)
        {
            sb.AppendLine("## Key Points");
            foreach (var kp in keyPoints)
            {
                sb.AppendLine(CultureInfo.InvariantCulture, $"- {kp}");
            }
            sb.AppendLine();
        }

        if (actionItems.Count > 0)
        {
            sb.AppendLine("## Action Items");
            foreach (var ai in actionItems)
            {
                sb.AppendLine(CultureInfo.InvariantCulture, $"- [ ] {ai}");
            }
            sb.AppendLine();
        }

        if (tags.Count > 0)
        {
            sb.Append("Tags: ");
            sb.AppendLine(string.Join(", ", tags));
        }

        return sb.ToString();
    }

    private static string BuildFallbackBody(SummaryPeriod period, string concatenated)
    {
        var sb = new StringBuilder();
        sb.AppendLine(CultureInfo.InvariantCulture, $"# {period.Label}");
        sb.AppendLine();
        sb.AppendLine(CultureInfo.InvariantCulture, $"Period: {period.From:yyyy-MM-dd} – {period.To:yyyy-MM-dd}");
        sb.AppendLine();
        sb.AppendLine("## Notes");
        sb.AppendLine(concatenated);
        return sb.ToString();
    }
}
