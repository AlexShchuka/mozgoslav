using HotChocolate.Execution.Configuration;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL;

internal static class TypesRegistration
{
    internal static IRequestExecutorBuilder AddMozgoslavTypes(
        this IRequestExecutorBuilder builder)
    {
        return builder
            .AddInterfaceType<IUserError>()
            .AddType<ValidationError>()
            .AddType<NotFoundError>()
            .AddType<ConflictError>()
            .AddType<UnavailableError>();
    }
}
