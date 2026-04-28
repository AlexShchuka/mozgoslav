using HotChocolate.Execution.Configuration;

using Microsoft.Extensions.DependencyInjection;

using Mozgoslav.Api.GraphQL.Backup;
using Mozgoslav.Api.GraphQL.Dictation;
using Mozgoslav.Api.GraphQL.Jobs;
using Mozgoslav.Api.GraphQL.Meetily;
using Mozgoslav.Api.GraphQL.Models;
using Mozgoslav.Api.GraphQL.Notes;
using Mozgoslav.Api.GraphQL.Obsidian;
using Mozgoslav.Api.GraphQL.Profiles;
using Mozgoslav.Api.GraphQL.Rag;
using Mozgoslav.Api.GraphQL.Recordings;
using Mozgoslav.Api.GraphQL.Settings;
using Mozgoslav.Api.GraphQL.Sync;
using Mozgoslav.Api.GraphQL.WebSearch;

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
            .AddTypeExtension<ModelMutationType>()
            .AddTypeExtension<RecordingMutationType>()
            .AddTypeExtension<NoteMutationType>()
            .AddTypeExtension<JobMutationType>()
            .AddTypeExtension<DictationMutationType>()
            .AddTypeExtension<ObsidianMutationType>()
            .AddTypeExtension<MeetilyMutationType>()
            .AddTypeExtension<BackupMutationType>()
            .AddTypeExtension<RagMutationType>()
            .AddTypeExtension<SyncMutationType>()
            .AddTypeExtension<WebSearchMutationType>();
    }
}
