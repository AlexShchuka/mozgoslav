using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Rag;

public sealed class RagService : IRagService
{
    private const int MinTopK = 1;
    private const int MaxTopK = 20;
    private const int RetrievalCandidateMultiplier = 10;

    private readonly IEmbeddingService _embedding;
    private readonly IVectorIndex _index;
    private readonly IRetriever _retriever;
    private readonly IReranker _reranker;
    private readonly ILlmService _llm;
    private readonly ILogger<RagService> _logger;

    public RagService(
        IEmbeddingService embedding,
        IVectorIndex index,
        IRetriever retriever,
        IReranker reranker,
        ILlmService llm,
        ILogger<RagService> logger)
    {
        _embedding = embedding;
        _index = index;
        _retriever = retriever;
        _reranker = reranker;
        _llm = llm;
        _logger = logger;
    }

    public async Task IndexAsync(ProcessedNote note, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(note);
        var text = string.IsNullOrWhiteSpace(note.MarkdownContent)
            ? note.CleanTranscript
            : note.MarkdownContent;
        var chunks = NoteChunker.Chunk(text);

        await _index.RemoveByNoteAsync(note.Id, ct);
        for (var i = 0; i < chunks.Count; i++)
        {
            var embedding = await _embedding.EmbedAsync(chunks[i], ct);
            await _index.UpsertAsync(
                new NoteChunk(
                    Id: $"{note.Id:D}:{i}",
                    NoteId: note.Id,
                    Text: chunks[i],
                    Embedding: embedding),
                ct);
        }
        _logger.LogInformation("Indexed note {NoteId} ({ChunkCount} chunks)", note.Id, chunks.Count);
    }

    public Task DeindexAsync(Guid noteId, CancellationToken ct)
    {
        return _index.RemoveByNoteAsync(noteId, ct);
    }

    public async Task<RagAnswer> AnswerAsync(string question, int topK, CancellationToken ct)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(question);
        topK = Math.Clamp(topK, MinTopK, MaxTopK);

        var candidateK = topK * RetrievalCandidateMultiplier;
        var query = new RetrievalQuery(question, candidateK);
        var candidates = await _retriever.RetrieveAsync(query, ct);

        if (candidates.Count == 0)
        {
            return new RagAnswer(
                Answer: "В базе не нашлось заметок, относящихся к вопросу.",
                Citations: [],
                LlmAvailable: true);
        }

        var reranked = await _reranker.RerankAsync(question, candidates, topK, ct);
        var hits = reranked
            .Select(r => new NoteChunkHit(
                new NoteChunk(
                    r.Chunk.ChunkId,
                    Guid.TryParse(r.Chunk.NoteId, out var nid) ? nid : Guid.Empty,
                    r.Chunk.Text,
                    r.Chunk.Embedding),
                r.RerankScore))
            .ToArray();

        var llmAvailable = await SafeIsAvailableAsync(ct);
        if (!llmAvailable)
        {
            _logger.LogWarning("LLM unavailable — returning citations without synthesised answer");
            return new RagAnswer(
                Answer: "LLM недоступен — ниже фрагменты заметок, наиболее близкие к запросу.",
                Citations: hits,
                LlmAvailable: false);
        }

        var answer = await SafeLlmAnswerAsync(question, hits, ct);
        return new RagAnswer(answer, hits, LlmAvailable: true);
    }

    private async Task<bool> SafeIsAvailableAsync(CancellationToken ct)
    {
        try
        {
            return await _llm.IsAvailableAsync(ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return false;
        }
    }

    private async Task<string> SafeLlmAnswerAsync(
        string question,
        IReadOnlyList<NoteChunkHit> hits,
        CancellationToken ct)
    {
        var userPrompt = BuildUserPrompt(question, hits);
        const string SystemPrompt =
            "Ты помощник, который отвечает на вопросы, опираясь ТОЛЬКО на фрагменты заметок, " +
            "приведённые ниже. Если ответа в них нет — честно скажи, что не знаешь. " +
            "Не выдумывай фактов. Отвечай кратко, по-русски.";
        try
        {
            var result = await _llm.ProcessAsync(userPrompt, SystemPrompt, ct);
            return string.IsNullOrWhiteSpace(result.Summary)
                ? FallbackCitationSummary(hits)
                : result.Summary.Trim();
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "LLM call failed during RAG answer synthesis");
            return FallbackCitationSummary(hits);
        }
    }

    private static string BuildUserPrompt(string question, IReadOnlyList<NoteChunkHit> hits)
    {
        var sb = new StringBuilder();
        sb.Append("Вопрос: ").AppendLine(question);
        sb.AppendLine();
        sb.AppendLine("Фрагменты заметок:");
        for (var i = 0; i < hits.Count; i++)
        {
            sb.Append('[').Append(i + 1).Append("] ").AppendLine(hits[i].Chunk.Text);
        }
        return sb.ToString();
    }

    private static string FallbackCitationSummary(IReadOnlyList<NoteChunkHit> hits) =>
        string.Join(
            "\n\n",
            hits.Select((h, i) => $"[{i + 1}] {h.Chunk.Text}"));
}
