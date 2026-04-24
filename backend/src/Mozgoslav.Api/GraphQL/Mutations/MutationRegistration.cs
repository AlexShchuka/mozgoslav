using HotChocolate.Execution.Configuration;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Api.GraphQL.Models;
using Mozgoslav.Api.GraphQL.Profiles;
using Mozgoslav.Api.GraphQL.Settings;

namespace Mozgoslav.Api.GraphQL.Mutations;

internal static class MutationRegistration
{
    internal static IRequestExecutorBuilder AddMozgoslavMutations(
        this IRequestExecutorBuilder builder)
    {
        return builder
            .AddMutationType<MutationType>()
            .AddTypeExtension<SettingsMutationType>()
            .AddTypeExtension<ProfileMutationType>()
            .AddTypeExtension<ModelMutationType>();
    }
}
