using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Exceptions;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;

namespace Mozgoslav.Api.GraphQL.Rag;

[ExtendObjectType(typeof(QueryType))]
public sealed class RagQueryType
{
    private const int SnippetMaxChars = 200;

    public async Task<RagIndexStatus> RagStatus(
        [Service] IProcessedNoteRepository notes,
        [Service] IVectorIndex index,
        CancellationToken ct)
    {
        var noteCount = await notes.CountAsync(ct);
        return new RagIndexStatus(noteCount, index.Count);
    }

    public async Task<RagQueryResult?> RagQuery(
        string question,
        int? topK,
        [Service] IRagService rag,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(question))
        {
            return null;
        }
        var k = topK ?? 5;
        try
        {
            var answer = await rag.AnswerAsync(question, k, ct);
            return new RagQueryResult(
                answer.Answer,
                answer.Citations.Select(h => new RagCitation(
                    h.Chunk.NoteId,
                    h.Chunk.Id,
                    h.Chunk.Text,
                    BuildSnippet(h.Chunk.Text))).ToArray(),
                answer.LlmAvailable);
        }
        catch (SidecarUnavailableException ex)
        {
            throw new GraphQLException(ErrorBuilder.New()
                .SetMessage("RAG embedding sidecar is unavailable.")
                .SetCode("SIDECAR_UNAVAILABLE")
                .SetExtension("statusCode", 503)
                .SetExtension("sidecar", ex.Sidecar)
                .SetException(ex)
                .Build());
        }
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
