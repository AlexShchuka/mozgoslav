using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Prompts;
using Mozgoslav.Application.Rag;
using Mozgoslav.Application.WebSearch;

namespace Mozgoslav.Infrastructure.Prompts;

public sealed class MozgoslavPromptBuilder : IPromptBuilder
{
    private static readonly Regex PlaceholderPattern = new(
        @"\{(?<name>[a-z_]+)(?:\((?<args>[^)]*)\))?\}",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    private readonly IRagService _ragService;
    private readonly IWebSearch _webSearch;
    private readonly ILogger<MozgoslavPromptBuilder> _logger;

    public MozgoslavPromptBuilder(
        IRagService ragService,
        IWebSearch webSearch,
        ILogger<MozgoslavPromptBuilder> logger)
    {
        _ragService = ragService;
        _webSearch = webSearch;
        _logger = logger;
    }

    public async Task<string> BuildAsync(
        string promptTemplate,
        IReadOnlyDictionary<string, string> context,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(promptTemplate);
        ArgumentNullException.ThrowIfNull(context);

        var result = new StringBuilder(promptTemplate);

        foreach (var (key, value) in context)
        {
            result.Replace($"{{{key}}}", value);
        }

        var workingTemplate = result.ToString();
        var matches = PlaceholderPattern.Matches(workingTemplate);
        if (matches.Count == 0)
        {
            return workingTemplate;
        }

        var resolved = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (Match match in matches)
        {
            var placeholder = match.Value;
            if (resolved.ContainsKey(placeholder))
            {
                continue;
            }

            var name = match.Groups["name"].Value.ToLowerInvariant();
            var args = match.Groups["args"].Value.Trim('"', '\'', ' ');

            var replacement = await TryResolveAsync(name, args, ct);
            resolved[placeholder] = replacement ?? placeholder;
        }

        var final = workingTemplate;
        foreach (var (placeholder, replacement) in resolved)
        {
            final = final.Replace(placeholder, replacement, StringComparison.Ordinal);
        }

        return final;
    }

    private async Task<string?> TryResolveAsync(string name, string args, CancellationToken ct)
    {
        try
        {
            if (name == "corpus.query")
            {
                var answer = await _ragService.AnswerAsync(args, 5, ct);
                return answer.Answer;
            }

            if (name == "web.search")
            {
                var results = await _webSearch.SearchAsync(args, 3, ct);
                var sb = new StringBuilder();
                foreach (var r in results)
                {
                    sb.AppendLine($"- [{r.Title}]({r.Url}): {r.Snippet}");
                }
                return sb.ToString().TrimEnd();
            }

            if (name == "recent.notes")
            {
                return string.Empty;
            }

            if (name == "repo.diff")
            {
                return string.Empty;
            }

            return null;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Failed to resolve placeholder {Name}({Args})", name, args);
            return null;
        }
    }
}
