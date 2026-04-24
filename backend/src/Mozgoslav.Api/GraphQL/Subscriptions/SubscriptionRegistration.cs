using HotChocolate.Execution.Configuration;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Api.GraphQL.Models;

namespace Mozgoslav.Api.GraphQL.Subscriptions;

internal static class SubscriptionRegistration
{
    internal static IRequestExecutorBuilder AddMozgoslavSubscriptions(
        this IRequestExecutorBuilder builder)
    {
        return builder
            .AddSubscriptionType<SubscriptionType>()
            .AddTypeExtension<ModelSubscriptionType>();
    }
}
