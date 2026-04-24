using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.Settings;

[ExtendObjectType(typeof(QueryType))]
public sealed class LlmCatalogQueryType
{
    public async Task<IReadOnlyList<string>> LlmModels(
        [Service] ILlmService llm,
        CancellationToken ct)
    {
        return await llm.ListAvailableModelsAsync(ct);
    }
}
