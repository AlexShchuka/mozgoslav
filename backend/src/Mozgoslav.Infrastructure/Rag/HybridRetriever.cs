using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Mozgoslav.Application.Rag;

namespace Mozgoslav.Infrastructure.Rag;

public sealed class HybridRetrieverOptions
{
    public const string SectionName = "Mozgoslav:Rag:Hybrid";
    public bool Enabled { get; set; } = true;
    public int RrfK { get; set; } = 60;
}

public sealed class HybridRetriever : IRetriever
{
    private readonly IEmbeddingService _embedding;
    private readonly IVectorIndex _vectorIndex;
    private readonly string _connectionString;
    private readonly HybridRetrieverOptions _options;
    private readonly ILogger<HybridRetriever> _logger;

    public HybridRetriever(
        IEmbeddingService embedding,
        IVectorIndex vectorIndex,
        string connectionString,
        IOptions<HybridRetrieverOptions> options,
        ILogger<HybridRetriever> logger)
    {
        _embedding = embedding;
        _vectorIndex = vectorIndex;
        _connectionString = connectionString;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<IReadOnlyList<RetrievedChunk>> RetrieveAsync(
        RetrievalQuery query,
        CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentException.ThrowIfNullOrWhiteSpace(query.Query);

        var candidateK = _options.Enabled ? Math.Max(query.TopK * 10, 50) : query.TopK;

        if (!_options.Enabled)
        {
            var queryVector = await _embedding.EmbedAsync(query.Query, ct);
            var denseHits = await SearchDenseAsync(queryVector, candidateK, query.Filter, ct);
            return denseHits.Take(query.TopK).ToArray();
        }

        var embeddingTask = _embedding.EmbedAsync(query.Query, ct);
        var ftsTask = SearchFtsAsync(query.Query, candidateK, query.Filter, ct);

        var (embedding, ftsHits) = (await embeddingTask, await ftsTask);
        var hybridDenseHits = await SearchDenseAsync(embedding, candidateK, query.Filter, ct);
        return MergeWithRrf(hybridDenseHits, ftsHits, query.TopK, _options.RrfK);
    }

    private async Task<IReadOnlyList<RetrievedChunk>> SearchDenseAsync(
        float[] queryVector,
        int topK,
        MetadataFilter? filter,
        CancellationToken ct)
    {
        var rawHits = await _vectorIndex.SearchAsync(queryVector, topK * 3, ct);

        var filtered = ApplyFilter(rawHits.Select(h => new RetrievedChunk(
            ChunkId: h.Chunk.Id,
            NoteId: h.Chunk.NoteId.ToString("D"),
            Text: h.Chunk.Text,
            Embedding: h.Chunk.Embedding,
            CreatedAt: DateTimeOffset.UtcNow,
            ProfileId: null,
            Speaker: null,
            Score: h.Score)), filter);

        return filtered.Take(topK).ToArray();
    }

    private async Task<IReadOnlyList<FtsHit>> SearchFtsAsync(
        string query,
        int topK,
        MetadataFilter? filter,
        CancellationToken ct)
    {
        var results = new List<FtsHit>(topK);
        try
        {
            await using var conn = new SqliteConnection(_connectionString);
            await conn.OpenAsync(ct);

            var sql = BuildFtsQuery(filter);
            await using var cmd = conn.CreateCommand();
#pragma warning disable CA2100
            cmd.CommandText = sql;
#pragma warning restore CA2100
            cmd.Parameters.AddWithValue("$query", SanitizeFtsQuery(query));
            cmd.Parameters.AddWithValue("$topk", topK);

            if (filter?.FromUtc.HasValue == true)
            {
                cmd.Parameters.AddWithValue("$from", filter.FromUtc.Value.ToString("O"));
            }
            if (filter?.ToUtc.HasValue == true)
            {
                cmd.Parameters.AddWithValue("$to", filter.ToUtc.Value.ToString("O"));
            }
            if (filter?.ProfileIds?.Count > 0)
            {
                for (var i = 0; i < filter.ProfileIds.Count; i++)
                {
                    cmd.Parameters.AddWithValue($"$profile_{i}", filter.ProfileIds[i]);
                }
            }
            if (filter?.SpeakerIds?.Count > 0)
            {
                for (var i = 0; i < filter.SpeakerIds.Count; i++)
                {
                    cmd.Parameters.AddWithValue($"$speaker_{i}", filter.SpeakerIds[i]);
                }
            }

            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                results.Add(new FtsHit(
                    ChunkId: reader.GetString(0),
                    Rank: reader.GetDouble(1)));
            }
        }
        catch (Exception ex) when (ex is SqliteException or InvalidOperationException)
        {
            _logger.LogWarning(ex, "FTS5 search failed; falling back to dense-only");
            return [];
        }
        return results;
    }

    private static string BuildFtsQuery(MetadataFilter? filter)
    {
        var hasDateFilter = filter?.FromUtc.HasValue == true || filter?.ToUtc.HasValue == true;
        var hasProfileFilter = filter?.ProfileIds?.Count > 0;
        var hasSpeakerFilter = filter?.SpeakerIds?.Count > 0;
        var needsJoin = hasDateFilter || hasProfileFilter || hasSpeakerFilter;

        if (!needsJoin)
        {
            return """
                SELECT f.chunk_id, -rank AS bm25_score
                FROM rag_chunks_fts f
                WHERE rag_chunks_fts MATCH $query
                ORDER BY rank
                LIMIT $topk
                """;
        }

        var whereJoin = new List<string>();
        if (filter?.FromUtc.HasValue == true)
        {
            whereJoin.Add("c.created_at >= $from");
        }
        if (filter?.ToUtc.HasValue == true)
        {
            whereJoin.Add("c.created_at <= $to");
        }
        if (filter?.ProfileIds?.Count > 0)
        {
            var placeholders = string.Join(", ", Enumerable.Range(0, filter.ProfileIds.Count).Select(i => $"$profile_{i}"));
            whereJoin.Add($"c.profile_id IN ({placeholders})");
        }
        if (filter?.SpeakerIds?.Count > 0)
        {
            var placeholders = string.Join(", ", Enumerable.Range(0, filter.SpeakerIds.Count).Select(i => $"$speaker_{i}"));
            whereJoin.Add($"c.speaker IN ({placeholders})");
        }

        var whereClause = whereJoin.Count > 0
            ? "AND " + string.Join(" AND ", whereJoin)
            : string.Empty;

        return $"""
            SELECT f.chunk_id, -rank AS bm25_score
            FROM rag_chunks_fts f
            JOIN rag_chunks c ON c.id = f.chunk_id
            WHERE rag_chunks_fts MATCH $query
            {whereClause}
            ORDER BY rank
            LIMIT $topk
            """;
    }

    private static IEnumerable<RetrievedChunk> ApplyFilter(
        IEnumerable<RetrievedChunk> chunks,
        MetadataFilter? filter)
    {
        if (filter is null)
        {
            return chunks;
        }
        var result = chunks.AsEnumerable();
        if (filter.FromUtc.HasValue)
        {
            result = result.Where(c => c.CreatedAt >= filter.FromUtc.Value);
        }
        if (filter.ToUtc.HasValue)
        {
            result = result.Where(c => c.CreatedAt <= filter.ToUtc.Value);
        }
        if (filter.ProfileIds?.Count > 0)
        {
            var set = new HashSet<string>(filter.ProfileIds, StringComparer.OrdinalIgnoreCase);
            result = result.Where(c => c.ProfileId is not null && set.Contains(c.ProfileId));
        }
        if (filter.SpeakerIds?.Count > 0)
        {
            var set = new HashSet<string>(filter.SpeakerIds, StringComparer.OrdinalIgnoreCase);
            result = result.Where(c => c.Speaker is not null && set.Contains(c.Speaker));
        }
        return result;
    }

    private static IReadOnlyList<RetrievedChunk> MergeWithRrf(
        IReadOnlyList<RetrievedChunk> denseRanked,
        IReadOnlyList<FtsHit> ftsRanked,
        int topK,
        int rrfK)
    {
        var scores = new Dictionary<string, double>(StringComparer.Ordinal);

        for (var i = 0; i < denseRanked.Count; i++)
        {
            var id = denseRanked[i].ChunkId;
            scores[id] = scores.GetValueOrDefault(id) + 1.0 / (rrfK + i + 1);
        }
        for (var i = 0; i < ftsRanked.Count; i++)
        {
            var id = ftsRanked[i].ChunkId;
            scores[id] = scores.GetValueOrDefault(id) + 1.0 / (rrfK + i + 1);
        }

        var denseById = denseRanked.ToDictionary(c => c.ChunkId, StringComparer.Ordinal);

        return scores
            .OrderByDescending(kv => kv.Value)
            .Take(topK)
            .Where(kv => denseById.ContainsKey(kv.Key))
            .Select(kv =>
            {
                var chunk = denseById[kv.Key];
                return chunk with { Score = kv.Value };
            })
            .ToArray();
    }

    private static string SanitizeFtsQuery(string raw)
    {
        return raw
            .Replace("\"", " ", StringComparison.Ordinal)
            .Replace("*", " ", StringComparison.Ordinal)
            .Replace("(", " ", StringComparison.Ordinal)
            .Replace(")", " ", StringComparison.Ordinal)
            .Trim();
    }

    private sealed record FtsHit(string ChunkId, double Rank);
}
