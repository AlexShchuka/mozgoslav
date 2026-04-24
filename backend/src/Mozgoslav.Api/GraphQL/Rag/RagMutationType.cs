using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;

namespace Mozgoslav.Api.GraphQL.Rag;

[ExtendObjectType(typeof(MutationType))]
public sealed class RagMutationType
{
    public async Task<RagReindexPayload> RagReindex(
        [Service] IProcessedNoteRepository notes,
        [Service] IRagService rag,
        [Service] IVectorIndex index,
        CancellationToken ct)
    {
        try
        {
            var allNotes = await notes.GetAllAsync(ct);
            foreach (var note in allNotes)
            {
                await rag.IndexAsync(note, ct);
            }
            return new RagReindexPayload(allNotes.Count, index.Count, []);
        }
        catch (Exception ex)
        {
            return new RagReindexPayload(null, null, [new UnavailableError("REINDEX_FAILED", ex.Message)]);
        }
    }
}
