using HotChocolate.Execution.Configuration;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Api.GraphQL.Health;
using Mozgoslav.Api.GraphQL.Models;
using Mozgoslav.Api.GraphQL.Profiles;
using Mozgoslav.Api.GraphQL.Settings;

namespace Mozgoslav.Api.GraphQL.Queries;

internal static class QueryRegistration
{
    internal static IRequestExecutorBuilder AddMozgoslavQueries(
        this IRequestExecutorBuilder builder)
    {
        return builder
            .AddQueryType<QueryType>()
            .AddTypeExtension<HealthQueryType>()
            .AddTypeExtension<SettingsQueryType>()
            .AddTypeExtension<ProfileQueryType>()
            .AddTypeExtension<ModelQueryType>();
    }
}
