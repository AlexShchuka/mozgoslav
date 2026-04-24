using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;
using HotChocolate.Types.Relay;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Recordings;

[Node]
[ExtendObjectType(typeof(Recording))]
public sealed class RecordingType
{
    [NodeResolver]
    public static Task<Recording?> GetByIdAsync(
        Guid id,
        [Service] IRecordingRepository repository,
        CancellationToken ct)
        => repository.GetByIdAsync(id, ct);
}
