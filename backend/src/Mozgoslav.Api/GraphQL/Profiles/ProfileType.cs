using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;
using HotChocolate.Types.Relay;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Profiles;

[Node]
[ExtendObjectType(typeof(Profile))]
public sealed class ProfileType
{
    [NodeResolver]
    public static Task<Profile?> GetByIdAsync(
        Guid id,
        [Service] IProfileRepository repository,
        CancellationToken ct)
        => repository.GetByIdAsync(id, ct);
}
