using HotChocolate.Execution.Configuration;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Api.GraphQL.Backup;
using Mozgoslav.Api.GraphQL.Dictation;
using Mozgoslav.Api.GraphQL.Health;
using Mozgoslav.Api.GraphQL.Jobs;
using Mozgoslav.Api.GraphQL.Models;
using Mozgoslav.Api.GraphQL.Notes;
using Mozgoslav.Api.GraphQL.Obsidian;
using Mozgoslav.Api.GraphQL.Profiles;
using Mozgoslav.Api.GraphQL.Rag;
using Mozgoslav.Api.GraphQL.Recordings;
using Mozgoslav.Api.GraphQL.Settings;
using Mozgoslav.Api.GraphQL.Sync;

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
            .AddTypeExtension<LlmCatalogQueryType>()
            .AddTypeExtension<ProfileQueryType>()
            .AddTypeExtension<ModelQueryType>()
            .AddTypeExtension<RecordingQueryType>()
            .AddTypeExtension<NoteQueryType>()
            .AddTypeExtension<JobQueryType>()
            .AddTypeExtension<DictationQueryType>()
            .AddTypeExtension<ObsidianQueryType>()
            .AddTypeExtension<BackupQueryType>()
            .AddTypeExtension<RagQueryType>()
            .AddTypeExtension<SyncQueryType>();
    }
}
