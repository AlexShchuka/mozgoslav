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
using Mozgoslav.Api.GraphQL.Prompts;
using Mozgoslav.Api.GraphQL.Rag;
using Mozgoslav.Api.GraphQL.Recordings;
using Mozgoslav.Api.GraphQL.Routines;
using Mozgoslav.Api.GraphQL.Search;
using Mozgoslav.Api.GraphQL.Settings;
using Mozgoslav.Api.GraphQL.Sync;
using Mozgoslav.Api.GraphQL.SystemActions;
using Mozgoslav.Api.GraphQL.WebSearch;

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
            .AddTypeExtension<LlmCapabilitiesQueryType>()
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
            .AddTypeExtension<SearchQueryType>()
            .AddTypeExtension<SyncQueryType>()
            .AddTypeExtension<WebSearchQueryType>()
            .AddTypeExtension<SystemActionQueryType>()
            .AddTypeExtension<PromptsQueryType>()
            .AddTypeExtension<RoutinesQueryType>();
    }
}
