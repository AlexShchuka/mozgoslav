using HotChocolate.Execution.Configuration;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Api.GraphQL.Dictation;
using Mozgoslav.Api.GraphQL.Jobs;
using Mozgoslav.Api.GraphQL.Models;
using Mozgoslav.Api.GraphQL.Sync;

namespace Mozgoslav.Api.GraphQL.Subscriptions;

internal static class SubscriptionRegistration
{
    internal static IRequestExecutorBuilder AddMozgoslavSubscriptions(
        this IRequestExecutorBuilder builder)
    {
        return builder
            .AddSubscriptionType<SubscriptionType>()
            .AddTypeExtension<ModelSubscriptionType>()
            .AddTypeExtension<JobSubscriptionType>()
            .AddTypeExtension<DictationSubscriptionType>()
            .AddTypeExtension<SyncSubscriptionType>();
    }
}
