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

/// <summary>
/// ADR-005 + ADR-007-shared §2.4 — thin HTTP surface over <see cref="IRagService"/>.
/// Contract:
/// <list type="bullet">
///   <item><c>GET  /api/rag/status</c>  → <c>{ chunks, notes }</c></item>
///   <item><c>POST /api/rag/reindex</c> → <c>{ embeddedNotes, chunks }</c></item>
///   <item><c>POST /api/rag/query</c>   → <c>{ answer, citations:[{noteId, segmentId, text, snippet}] }</c></item>
/// </list>
/// Frontend MR C consumes this shape verbatim; Phase 2 Backend MR C owns it.
/// </summary>
public static class RagEndpoints
{
    /// <summary>
    /// Short preview used in <c>citations[].snippet</c>. Long enough to be
    /// meaningful on its own, short enough that a list of 5 snippets fits on
    /// screen without scrolling.
    /// </summary>
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
