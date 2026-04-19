using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.Endpoints;

public static class ProfileEndpoints
{
    public sealed record CreateProfileRequest(
        string Name,
        string SystemPrompt,
        string? OutputTemplate,
        CleanupLevel CleanupLevel,
        string? ExportFolder,
        IReadOnlyList<string>? AutoTags,
        bool IsDefault,
        IReadOnlyList<string>? Glossary = null,
        bool LlmCorrectionEnabled = false);

    public static IEndpointRouteBuilder MapProfileEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/profiles", async (
            IProfileRepository repository,
            CancellationToken ct) =>
        {
            var profiles = await repository.GetAllAsync(ct);
            return Results.Ok(profiles);
        });

        endpoints.MapGet("/api/profiles/{id:guid}", async (
            Guid id,
            IProfileRepository repository,
            CancellationToken ct) =>
        {
            var profile = await repository.GetByIdAsync(id, ct);
            return profile is null ? Results.NotFound() : Results.Ok(profile);
        });

        endpoints.MapPost("/api/profiles", async (
            CreateProfileRequest request,
            IProfileRepository repository,
            CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(new { error = "Name is required" });
            }

            var profile = new Profile
            {
                Name = request.Name.Trim(),
                SystemPrompt = request.SystemPrompt ?? string.Empty,
                OutputTemplate = request.OutputTemplate ?? string.Empty,
                CleanupLevel = request.CleanupLevel,
                ExportFolder = string.IsNullOrWhiteSpace(request.ExportFolder) ? "_inbox" : request.ExportFolder,
                AutoTags = request.AutoTags?.ToList() ?? [],
                Glossary = request.Glossary?.ToList() ?? [],
                LlmCorrectionEnabled = request.LlmCorrectionEnabled,
                IsDefault = request.IsDefault,
                IsBuiltIn = false
            };

            if (request.IsDefault)
            {
                await DemoteCurrentDefaultAsync(repository, ct);
            }

            await repository.AddAsync(profile, ct);
            return Results.Created($"/api/profiles/{profile.Id}", profile);
        });

        endpoints.MapPost("/api/profiles/{id:guid}/duplicate", async (
            Guid id,
            IProfileRepository repository,
            CancellationToken ct) =>
        {
            var source = await repository.GetByIdAsync(id, ct);
            if (source is null)
            {
                return Results.NotFound();
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
                Glossary = source.Glossary.ToList(),
                LlmCorrectionEnabled = source.LlmCorrectionEnabled,
                IsDefault = false,
                IsBuiltIn = false,
            };
            await repository.AddAsync(copy, ct);
            return Results.Created($"/api/profiles/{copy.Id}", copy);
        });

        endpoints.MapPut("/api/profiles/{id:guid}", async (
            Guid id,
            CreateProfileRequest request,
            IProfileRepository repository,
            CancellationToken ct) =>
        {
            var existing = await repository.GetByIdAsync(id, ct);
            if (existing is null)
            {
                return Results.NotFound();
            }

            existing.Name = request.Name.Trim();
            existing.SystemPrompt = request.SystemPrompt ?? string.Empty;
            existing.OutputTemplate = request.OutputTemplate ?? string.Empty;
            existing.CleanupLevel = request.CleanupLevel;
            existing.ExportFolder = string.IsNullOrWhiteSpace(request.ExportFolder) ? "_inbox" : request.ExportFolder;
            existing.AutoTags = request.AutoTags?.ToList() ?? [];
            existing.Glossary = request.Glossary?.ToList() ?? [];
            existing.LlmCorrectionEnabled = request.LlmCorrectionEnabled;

            if (request.IsDefault && !existing.IsDefault)
            {
                await DemoteCurrentDefaultAsync(repository, ct);
            }
            existing.IsDefault = request.IsDefault;

            await repository.UpdateAsync(existing, ct);
            return Results.Ok(existing);
        });

        return endpoints;
    }

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
