using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Mozgoslav.Application.Agents;
using Mozgoslav.Application.Search;
using Mozgoslav.Infrastructure.Search.Tools;

namespace Mozgoslav.Infrastructure.Search;

public sealed class MafUnifiedSearch : IUnifiedSearch
{
    private readonly IAgentRunner _agentRunner;
    private readonly CorpusQueryTool _corpus;
    private readonly WebSearchTool _webSearch;
    private readonly WebFetchTool _webFetch;
    private readonly IOptions<UnifiedSearchOptions> _options;
    private readonly ILogger<MafUnifiedSearch> _logger;

    public MafUnifiedSearch(
        IAgentRunner agentRunner,
        CorpusQueryTool corpus,
        WebSearchTool webSearch,
        WebFetchTool webFetch,
        ObsidianReadTool obsidianRead,
        IOptions<UnifiedSearchOptions> options,
        ILogger<MafUnifiedSearch> logger)
    {
        ArgumentNullException.ThrowIfNull(obsidianRead);
        _agentRunner = agentRunner;
        _corpus = corpus;
        _webSearch = webSearch;
        _webFetch = webFetch;
        _options = options;
        _logger = logger;
    }

    public async Task<UnifiedSearchResult> AnswerAsync(UnifiedSearchQuery query, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentException.ThrowIfNullOrWhiteSpace(query.Query);

        var includeWeb = query.IncludeWeb && _options.Value.DefaultIncludeWeb;
        var maxCalls = _options.Value.MaxToolCalls;
        var seenUrls = new HashSet<string>(StringComparer.Ordinal);

        var citations = await GatherCitationsAsync(query, includeWeb, maxCalls, seenUrls, ct);

        var systemPrompt = BuildSystemPrompt(includeWeb);
        var prompt = $"Question: {query.Query}";

        var toolNames = new List<string> { CorpusQueryTool.ToolName, ObsidianReadTool.ToolName };
        if (includeWeb)
        {
            toolNames.Add(WebSearchTool.ToolName);
            toolNames.Add(WebFetchTool.ToolName);
        }

        var request = new AgentRunRequest(
            Prompt: prompt,
            SystemPrompt: systemPrompt,
            ToolNames: toolNames,
            ModelHint: null);

        try
        {
            var runResult = await _agentRunner.RunAsync(request, ct);
            if (!string.IsNullOrWhiteSpace(runResult.FinalAnswer))
            {
                return new UnifiedSearchResult(Answer: runResult.FinalAnswer, Citations: citations);
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "MafUnifiedSearch: AgentRunner failed, returning citations without synthesis");
        }

        var fallbackAnswer = citations.Count > 0
            ? string.Join("\n\n", citations.Select((c, i) => $"[{i + 1}] {c.Snippet}"))
            : "No relevant information found.";

        return new UnifiedSearchResult(Answer: fallbackAnswer, Citations: citations);
    }

    private async Task<List<UnifiedCitation>> GatherCitationsAsync(
        UnifiedSearchQuery query,
        bool includeWeb,
        int maxCalls,
        HashSet<string> seenUrls,
        CancellationToken ct)
    {
        var citations = new List<UnifiedCitation>();
        var callCount = 0;

        try
        {
            var chunks = await _corpus.ExecuteAsync(query.Query, query.Filter, 5, ct);
            callCount++;
            foreach (var chunk in chunks)
            {
                citations.Add(new UnifiedCitation(
                    Source: SourceType.Corpus,
                    Reference: chunk.NoteId,
                    Snippet: TruncateSnippet(chunk.Text),
                    Url: null));
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "MafUnifiedSearch: corpus query failed");
        }

        if (!includeWeb || callCount >= maxCalls)
        {
            return citations;
        }

        try
        {
            var searchResults = await _webSearch.ExecuteAsync(query.Query, 5, ct);
            callCount++;
            foreach (var result in searchResults)
            {
                seenUrls.Add(result.Url);
                citations.Add(new UnifiedCitation(
                    Source: SourceType.Web,
                    Reference: result.Title,
                    Snippet: result.Snippet,
                    Url: result.Url));
            }

            foreach (var result in searchResults.Take(3))
            {
                if (callCount >= maxCalls) break;
                try
                {
                    var content = await _webFetch.ExecuteAsync(result.Url, ct);
                    callCount++;
                    var idx = citations.FindIndex(c => c.Url == result.Url);
                    if (idx >= 0)
                    {
                        citations[idx] = citations[idx] with { Snippet = TruncateSnippet(content.Body) };
                    }
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    _logger.LogWarning(ex, "web.fetch failed for {Url}", result.Url);
                }
            }
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "MafUnifiedSearch: web search failed");
        }

        return citations;
    }

    private static string BuildSystemPrompt(bool includeWeb)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are a personal knowledge assistant. Use the available tools to answer the user question.");
        sb.AppendLine("Tool selection guide:");
        sb.AppendLine("- corpus.query: past conversations, personal notes, meeting summaries stored locally");
        sb.AppendLine("- obsidian.read: read a specific vault note by its vault-relative path");
        if (includeWeb)
        {
            sb.AppendLine("- web.search: current public information, recent events, facts not in personal notes");
            sb.AppendLine("- web.fetch: fetch full page body for a URL returned by web.search in this session only");
        }
        sb.AppendLine("Cite your sources. Answer concisely.");
        return sb.ToString();
    }

    private static string TruncateSnippet(string text)
    {
        const int MaxLen = 300;
        if (string.IsNullOrEmpty(text)) return string.Empty;
        var collapsed = text.ReplaceLineEndings(" ").Trim();
        return collapsed.Length <= MaxLen
            ? collapsed
            : string.Concat(collapsed.AsSpan(0, MaxLen).TrimEnd(), "…");
    }
}
