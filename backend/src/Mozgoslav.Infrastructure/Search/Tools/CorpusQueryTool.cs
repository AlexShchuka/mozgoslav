using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Agents;
using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Search.Tools;

public sealed class CorpusQueryTool : IAgentTool
{
    public const string ToolName = "corpus.query";

    private readonly IRetriever _retriever;
    private readonly IReranker _reranker;
    private readonly ILogger<CorpusQueryTool> _logger;

    public CorpusQueryTool(IRetriever retriever, IReranker reranker, ILogger<CorpusQueryTool> logger)
    {
        _retriever = retriever;
        _reranker = reranker;
        _logger = logger;
    }

    public string Name => ToolName;

    public string Description => "Search the personal notes corpus. Use for past conversations, personal notes, meeting summaries stored locally.";

    public async Task<string> InvokeAsync(string argsJson, CancellationToken ct)
    {
        var doc = JsonDocument.Parse(argsJson);
        var query = doc.RootElement.GetProperty("query").GetString() ?? string.Empty;
        var top = doc.RootElement.TryGetProperty("top", out var topEl) ? topEl.GetInt32() : 5;
        var chunks = await ExecuteAsync(query, null, top, ct);
        return JsonSerializer.Serialize(chunks.Select(c => new { c.NoteId, c.Text, c.Score }));
    }

    public async Task<IReadOnlyList<RetrievedChunk>> ExecuteAsync(
        string query,
        MetadataFilter? filter,
        int top,
        CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);
        var clampedTop = Math.Max(1, Math.Min(top, 20));
        var candidateK = clampedTop * 10;
        var retrieved = await _retriever.RetrieveAsync(
            new RetrievalQuery(query, candidateK, filter),
            ct);
        if (retrieved.Count == 0)
        {
            return [];
        }
        var reranked = await _reranker.RerankAsync(query, retrieved, clampedTop, ct);
        _logger.LogInformation(
            "corpus.query returned {Count} chunks for query of length {Len}",
            reranked.Count,
            query.Length);
        return reranked.Select(r => r.Chunk).ToArray();
    }

    public static JsonNode BuildToolSpec()
    {
        return JsonNode.Parse(JsonSerializer.Serialize(new
        {
            name = ToolName,
            description = "Search the personal notes corpus. Use for past conversations, personal notes, meeting summaries stored locally.",
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
