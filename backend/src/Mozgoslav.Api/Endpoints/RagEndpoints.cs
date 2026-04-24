using System;
using System.Linq;
using System.Threading;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;

namespace Mozgoslav.Api.Endpoints;

public static class RagEndpoints
{
    private const int SnippetMaxChars = 200;

    public sealed record QueryRequest(string Question, int? TopK);

    public static IEndpointRouteBuilder MapRagEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/rag/status", async (
            IProcessedNoteRepository notes,
            IVectorIndex index,
            CancellationToken ct) =>
        {
            var allNotes = await notes.GetAllAsync(ct);
            return Results.Ok(new
            {
                chunks = index.Count,
                notes = allNotes.Count,
            });
        });

        endpoints.MapPost("/api/rag/reindex", async (
            IProcessedNoteRepository notes,
            IRagService rag,
            IVectorIndex index,
            CancellationToken ct) =>
        {
            var allNotes = await notes.GetAllAsync(ct);
            foreach (var note in allNotes)
            {
                await rag.IndexAsync(note, ct);
            }
            return Results.Ok(new
            {
                embeddedNotes = allNotes.Count,
                chunks = index.Count,
            });
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
                citations = answer.Citations.Select(h => new
                {
                    noteId = h.Chunk.NoteId,
                    segmentId = h.Chunk.Id,
                    text = h.Chunk.Text,
                    snippet = BuildSnippet(h.Chunk.Text),
                }),
                llmAvailable = answer.LlmAvailable,
            });
        });

        return endpoints;
    }

    private static string BuildSnippet(string text)
    {
        if (string.IsNullOrEmpty(text))
        {
            return string.Empty;
        }
        var collapsed = text.ReplaceLineEndings(" ").Trim();
        return collapsed.Length <= SnippetMaxChars
            ? collapsed
            : string.Concat(collapsed.AsSpan(0, SnippetMaxChars).TrimEnd(), "…");
    }
}
