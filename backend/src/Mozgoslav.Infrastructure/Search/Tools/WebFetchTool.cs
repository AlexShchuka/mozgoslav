using System;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.WebSearch;

namespace Mozgoslav.Infrastructure.Search.Tools;

public sealed class WebFetchTool
{
    public const string ToolName = "web.fetch";

    private readonly IWebContentExtractor _extractor;
    private readonly ILogger<WebFetchTool> _logger;

    public WebFetchTool(IWebContentExtractor extractor, ILogger<WebFetchTool> logger)
    {
        _extractor = extractor;
        _logger = logger;
    }

    public async Task<WebContent> ExecuteAsync(string url, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(url);
        var content = await _extractor.ExtractAsync(url, ct);
        _logger.LogInformation("web.fetch extracted {BodyLen} chars from {Url}", content.Body.Length, url);
        return content;
    }

    public static JsonNode BuildToolSpec()
    {
        return JsonNode.Parse(JsonSerializer.Serialize(new
        {
            name = ToolName,
            description = "Fetch and extract the text body of a web page. Only call for URLs returned by web.search in this session.",
            parameters = new
            {
                type = "object",
                properties = new
                {
                    url = new { type = "string" },
                },
                required = new[] { "url" },
            },
        }))!;
    }
}
