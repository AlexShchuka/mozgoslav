using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Llm;

namespace Mozgoslav.Api.GraphQL.Settings;

[ExtendObjectType(typeof(QueryType))]
public sealed class LlmCatalogQueryType
{
    public Task<IReadOnlyList<LlmModelDescriptor>> LlmModels(
        [Service] IModelCatalogService catalog,
        CancellationToken ct)
    {
        return catalog.GetAvailableAsync(ct);
    }
}
