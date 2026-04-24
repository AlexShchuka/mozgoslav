using HotChocolate.Execution.Configuration;

namespace Mozgoslav.Api.GraphQL;

internal static class TypesRegistration
{
    internal static IRequestExecutorBuilder AddMozgoslavTypes(
        this IRequestExecutorBuilder builder)
    {
        return builder;
    }
}
