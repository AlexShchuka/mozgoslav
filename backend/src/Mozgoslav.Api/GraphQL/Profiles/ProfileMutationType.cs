using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Api.GraphQL.Profiles;

[ExtendObjectType(typeof(MutationType))]
public sealed class ProfileMutationType
{
    public async Task<ProfilePayload> CreateProfile(
        CreateProfileInput input,
        [Service] IProfileRepository repository,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.Name))
        {
            return new ProfilePayload(null, [new ValidationError("VALIDATION_ERROR", "Name is required", "name")]);
        }

        if (input.IsDefault)
        {
            await DemoteCurrentDefaultAsync(repository, ct);
        }

        var profile = new Profile
        {
            Name = input.Name.Trim(),
            SystemPrompt = input.SystemPrompt,
            OutputTemplate = input.OutputTemplate,
            CleanupLevel = input.CleanupLevel,
            ExportFolder = string.IsNullOrWhiteSpace(input.ExportFolder) ? "_inbox" : input.ExportFolder,
            AutoTags = input.AutoTags.ToList(),
            GlossaryByLanguage = ToGlossaryDictionary(input.GlossaryByLanguage),
            LlmCorrectionEnabled = input.LlmCorrectionEnabled,
            IsDefault = input.IsDefault,
            IsBuiltIn = false,
            LlmProviderOverride = input.LlmProviderOverride,
            LlmModelOverride = input.LlmModelOverride,
        };

        await repository.AddAsync(profile, ct);
        return new ProfilePayload(profile, []);
    }

    public async Task<ProfilePayload> UpdateProfile(
        Guid id,
        CreateProfileInput input,
        [Service] IProfileRepository repository,
        CancellationToken ct)
    {
        var existing = await repository.GetByIdAsync(id, ct);
        if (existing is null)
        {
            return new ProfilePayload(null, [new NotFoundError("NOT_FOUND", "Profile not found", "Profile", id.ToString())]);
        }

        if (string.IsNullOrWhiteSpace(input.Name))
        {
            return new ProfilePayload(null, [new ValidationError("VALIDATION_ERROR", "Name is required", "name")]);
        }

        if (input.IsDefault && !existing.IsDefault)
        {
            await DemoteCurrentDefaultAsync(repository, ct);
        }

        existing.Name = input.Name.Trim();
        existing.SystemPrompt = input.SystemPrompt;
        existing.OutputTemplate = input.OutputTemplate;
        existing.CleanupLevel = input.CleanupLevel;
        existing.ExportFolder = string.IsNullOrWhiteSpace(input.ExportFolder) ? "_inbox" : input.ExportFolder;
        existing.AutoTags = input.AutoTags.ToList();
        existing.GlossaryByLanguage = ToGlossaryDictionary(input.GlossaryByLanguage);
        existing.LlmCorrectionEnabled = input.LlmCorrectionEnabled;
        existing.IsDefault = input.IsDefault;
        existing.LlmProviderOverride = input.LlmProviderOverride;
        existing.LlmModelOverride = input.LlmModelOverride;

        await repository.UpdateAsync(existing, ct);
        return new ProfilePayload(existing, []);
    }

    public async Task<ProfilePayload> DeleteProfile(
        Guid id,
        [Service] IProfileRepository repository,
        CancellationToken ct)
    {
        var existing = await repository.GetByIdAsync(id, ct);
        if (existing is null)
        {
            return new ProfilePayload(null, [new NotFoundError("NOT_FOUND", "Profile not found", "Profile", id.ToString())]);
        }

        await repository.DeleteAsync(id, ct);
        return new ProfilePayload(null, []);
    }

    public async Task<ProfilePayload> DuplicateProfile(
        Guid id,
        [Service] IProfileRepository repository,
        CancellationToken ct)
    {
        var source = await repository.GetByIdAsync(id, ct);
        if (source is null)
        {
            return new ProfilePayload(null, [new NotFoundError("NOT_FOUND", "Profile not found", "Profile", id.ToString())]);
        }

        var copy = new Profile
        {
            Name = $"{source.Name} (copy)",
            SystemPrompt = source.SystemPrompt,
            TranscriptionPromptOverride = source.TranscriptionPromptOverride,
            OutputTemplate = source.OutputTemplate,
            CleanupLevel = source.CleanupLevel,
            ExportFolder = source.ExportFolder,
            AutoTags = source.AutoTags.ToList(),
            GlossaryByLanguage = source.GlossaryByLanguage
                .ToDictionary(kv => kv.Key, kv => kv.Value.ToList()),
            LlmCorrectionEnabled = source.LlmCorrectionEnabled,
            IsDefault = false,
            IsBuiltIn = false,
            LlmProviderOverride = source.LlmProviderOverride,
            LlmModelOverride = source.LlmModelOverride,
        };

        await repository.AddAsync(copy, ct);
        return new ProfilePayload(copy, []);
    }

    private static Dictionary<string, List<string>> ToGlossaryDictionary(IReadOnlyList<GlossaryEntryInput> entries)
        => entries.ToDictionary(e => e.Language, e => e.Terms.ToList());

    private static async Task DemoteCurrentDefaultAsync(IProfileRepository repository, CancellationToken ct)
    {
        var all = await repository.GetAllAsync(ct);
        foreach (var p in all.Where(p => p.IsDefault))
        {
            p.IsDefault = false;
            await repository.UpdateAsync(p, ct);
        }
    }
}
