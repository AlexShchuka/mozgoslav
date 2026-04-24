using HotChocolate.Execution.Configuration;

using Microsoft.Extensions.DependencyInjection;

namespace Mozgoslav.Api.GraphQL.Queries;

internal static class QueryRegistration
{
    internal static IRequestExecutorBuilder AddMozgoslavQueries(
        this IRequestExecutorBuilder builder)
    {
        return builder.AddQueryType<QueryType>();
    }
}
