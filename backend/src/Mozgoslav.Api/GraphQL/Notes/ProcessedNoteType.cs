using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;
using HotChocolate.Types.Relay;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Notes;

[Node]
[ExtendObjectType(typeof(ProcessedNote))]
public sealed class ProcessedNoteType
{
    [NodeResolver]
    public static Task<ProcessedNote?> GetByIdAsync(
        Guid id,
        [Service] IProcessedNoteRepository repository,
        CancellationToken ct)
        => repository.GetByIdAsync(id, ct);
}
