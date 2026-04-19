using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Rag;

/// <summary>
/// ADR-005 — top-level facade the API endpoint talks to. Everything the
/// feature needs (chunking + embedding + vector search + LLM answer
/// synthesis) hides behind these two methods.
/// </summary>
public interface IRagService
{
    /// <summary>
    /// Embeds the note's markdown and upserts its chunks into the index.
    /// Called whenever a note is created or materially edited.
    /// </summary>
    Task IndexAsync(ProcessedNote note, CancellationToken ct);

    /// <summary>
    /// Retrieves the top-K relevant chunks for <paramref name="question"/>
    /// and asks the LLM to synthesise an answer grounded in those chunks.
    /// Falls back to the raw citations if the LLM is unavailable.
    /// </summary>
    Task<RagAnswer> AnswerAsync(string question, int topK, CancellationToken ct);
}

/// <summary>Answer + the chunks it was grounded in, so the UI can render citations.</summary>
public sealed record RagAnswer(
    string Answer,
    IReadOnlyList<NoteChunkHit> Citations,
    bool LlmAvailable);
