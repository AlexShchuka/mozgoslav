using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using ModelContextProtocol.Server;

using Mozgoslav.Application.WebSearch;

namespace Mozgoslav.Infrastructure.Mcp.Tools;

[McpServerToolType]
public sealed class WebMcpTools
{
    private readonly IWebSearch _search;
    private readonly IWebContentExtractor _extractor;

    public WebMcpTools(IWebSearch search, IWebContentExtractor extractor)
    {
        _search = search;
        _extractor = extractor;
    }

    [McpServerTool(Name = "web.search")]
    [Description("Search the web via the local SearXNG aggregator. Returns titles, URLs and snippets.")]
    public async Task<IReadOnlyList<WebSearchMcpResult>> SearchAsync(
        [Description("Search query")] string query,
        [Description("Maximum results to return (1-10)")] int top = 5,
        CancellationToken cancellationToken = default)
    {
        var clampedTop = top < 1 ? 1 : top > 10 ? 10 : top;
        var results = await _search.SearchAsync(query, clampedTop, cancellationToken);
        return results.Select(r => new WebSearchMcpResult(r.Title, r.Url, r.Snippet)).ToList();
    }

    [McpServerTool(Name = "web.fetch")]
    [Description("Fetch and extract the main text content from a URL.")]
    public async Task<WebFetchMcpResult> FetchAsync(
        [Description("The URL to fetch")] string url,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var content = await _extractor.ExtractAsync(url, cancellationToken);
            return new WebFetchMcpResult(url, content.Title, content.Body, null);
        }
        catch (Exception ex)
        {
            return new WebFetchMcpResult(url, string.Empty, string.Empty, ex.Message);
        }
    }
}

public sealed record WebSearchMcpResult(string Title, string Url, string Snippet);
public sealed record WebFetchMcpResult(string Url, string Title, string Body, string? Error);
