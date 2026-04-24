using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;
using HotChocolate.Types.Relay;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Jobs;

[Node]
[ExtendObjectType(typeof(ProcessingJob))]
public sealed class ProcessingJobType
{
    [NodeResolver]
    public static Task<ProcessingJob?> GetByIdAsync(
        Guid id,
        [Service] IProcessingJobRepository repository,
        CancellationToken ct)
        => repository.GetByIdAsync(id, ct);
}
