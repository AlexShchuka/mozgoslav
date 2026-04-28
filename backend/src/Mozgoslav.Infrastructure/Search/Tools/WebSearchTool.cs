using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.WebSearch;

namespace Mozgoslav.Infrastructure.Search.Tools;

public sealed class WebSearchTool
{
    public const string ToolName = "web.search";

    private readonly IWebSearch _webSearch;
    private readonly ILogger<WebSearchTool> _logger;

    public WebSearchTool(IWebSearch webSearch, ILogger<WebSearchTool> logger)
    {
        _webSearch = webSearch;
        _logger = logger;
    }

    public async Task<IReadOnlyList<WebSearchResult>> ExecuteAsync(
        string query,
        int top,
        CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        var clampedTop = Math.Max(1, Math.Min(top, 10));
        var results = await _webSearch.SearchAsync(query, clampedTop, ct);
        _logger.LogInformation(
            "web.search returned {Count} results for query of length {Len}",
            results.Count,
            query.Length);
        return results;
    }

    public static JsonNode BuildToolSpec()
    {
        return JsonNode.Parse(JsonSerializer.Serialize(new
        {
            name = ToolName,
            description = "Search the web for current public information. Use when the user asks about recent events, public facts, or anything not in personal notes.",
            parameters = new
            {
                type = "object",
                properties = new
                {
                    query = new { type = "string" },
                    top = new { type = "integer", @default = 5 },
                },
                required = new[] { "query" },
            },
        }))!;
    }
}
