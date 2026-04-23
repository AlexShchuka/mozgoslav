using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Rag;

public interface IRagService
{
    Task IndexAsync(ProcessedNote note, CancellationToken ct);

    Task DeindexAsync(Guid noteId, CancellationToken ct);

    Task<RagAnswer> AnswerAsync(string question, int topK, CancellationToken ct);
}

public sealed record RagAnswer(
    string Answer,
    IReadOnlyList<NoteChunkHit> Citations,
    bool LlmAvailable);
