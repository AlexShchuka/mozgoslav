using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

using Mozgoslav.Api.GraphQL.Jobs;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Api.GraphQL.Notes;
using Mozgoslav.Api.GraphQL.Profiles;
using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Api.GraphQL.Recordings;
using Mozgoslav.Api.GraphQL.Subscriptions;

namespace Mozgoslav.Api.GraphQL;

internal static class SchemaBuilderExtensions
{
    public static IServiceCollection AddMozgoslavGraphQL(this IServiceCollection services, IHostEnvironment environment)
    {
        var builder = services
            .AddGraphQLServer()
            .AddGlobalObjectIdentification()
            .AddMozgoslavQueries()
            .AddMozgoslavMutations()
            .AddMozgoslavSubscriptions()
            .AddMozgoslavTypes()
            .AddTypeExtension<ProfileType>()
            .AddTypeExtension<RecordingType>()
            .AddDataLoader<RecordingByIdDataLoader>()
            .AddDataLoader<NotesByRecordingIdDataLoader>()
            .AddTypeExtension<ProcessedNoteType>()
            .AddDataLoader<ProcessedNoteByIdDataLoader>()
            .AddTypeExtension<ProcessingJobType>()
            .AddTypeExtension<ProcessingJobStagesExtension>()
            .AddDataLoader<ProcessingJobByIdDataLoader>()
            .AddFiltering()
            .AddSorting()
            .AddProjections()
            .AddInMemorySubscriptions()
            .ModifyOptions(o => o.StrictValidation = true)
            .ModifyPagingOptions(o =>
            {
                o.IncludeTotalCount = true;
                o.DefaultPageSize = 25;
                o.MaxPageSize = 200;
                o.RequirePagingBoundaries = false;
            })
            .ModifyRequestOptions(o => o.IncludeExceptionDetails = false);

        if (environment.IsProduction())
        {
            builder.DisableIntrospection();
        }

        return services;
    }
}
