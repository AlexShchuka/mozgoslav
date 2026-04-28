using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Llm;

namespace Mozgoslav.Api.GraphQL.Settings;

[ExtendObjectType(typeof(QueryType))]
public sealed class LlmCapabilitiesQueryType
{
    public LlmCapabilities? LlmCapabilities([Service] ILlmCapabilitiesCache cache)
        => cache.TryGetCurrent();
}
