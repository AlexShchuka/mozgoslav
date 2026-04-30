using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Profiles;

[ExtendObjectType(typeof(QueryType))]
public sealed class ProfileQueryType
{
    public async Task<IReadOnlyList<Profile>> Profiles(
        [Service] IProfileRepository repository,
        CancellationToken ct)
        => await repository.GetAllAsync(ct);

    public async Task<Profile?> Profile(
        Guid id,
        [Service] IProfileRepository repository,
        CancellationToken ct)
        => await repository.GetByIdAsync(id, ct);

    public async Task<IReadOnlyList<string>> SuggestGlossaryTerms(
        Guid profileId,
        string language,
        [Service] SuggestGlossaryTermsUseCase useCase,
        CancellationToken ct)
        => await useCase.ExecuteAsync(profileId, language, ct);
}
