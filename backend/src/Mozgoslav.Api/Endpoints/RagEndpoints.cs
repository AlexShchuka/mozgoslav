using Microsoft.AspNetCore.Mvc;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;

namespace Mozgoslav.Api.Endpoints;

/// <summary>
/// ADR-005 — thin HTTP surface over <see cref="IRagService"/>.
/// <c>POST /api/rag/reindex</c> rebuilds the index from scratch;
/// <c>POST /api/rag/query</c> asks a question grounded in that index.
/// </summary>
public static class RagEndpoints
{
    public sealed record QueryRequest(string Question, int? TopK);

    public static IEndpointRouteBuilder MapRagEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/rag/reindex", async (
            IProcessedNoteRepository notes,
            IRagService rag,
            CancellationToken ct) =>
        {
            var allNotes = await notes.GetAllAsync(ct);
            foreach (var note in allNotes)
            {
                await rag.IndexAsync(note, ct);
            }
            return Results.Ok(new { indexed = allNotes.Count });
        });

        endpoints.MapPost("/api/rag/query", async (
            [FromBody] QueryRequest request,
            IRagService rag,
            CancellationToken ct) =>
        {
            if (request is null || string.IsNullOrWhiteSpace(request.Question))
            {
                return Results.BadRequest(new { error = "question is required" });
            }
            var topK = request.TopK ?? 5;
            var answer = await rag.AnswerAsync(request.Question, topK, ct);
            return Results.Ok(new
            {
                answer = answer.Answer,
                llmAvailable = answer.LlmAvailable,
                citations = answer.Citations.Select(h => new
                {
                    noteId = h.Chunk.NoteId,
                    chunkId = h.Chunk.Id,
                    text = h.Chunk.Text,
                    score = h.Score,
                }),
            });
        });

        return endpoints;
    }
}
