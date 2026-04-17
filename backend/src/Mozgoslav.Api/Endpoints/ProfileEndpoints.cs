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
        string? TranscriptionPromptOverride = null);

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
                TranscriptionPromptOverride = request.TranscriptionPromptOverride ?? string.Empty,
                OutputTemplate = request.OutputTemplate ?? string.Empty,
                CleanupLevel = request.CleanupLevel,
                ExportFolder = string.IsNullOrWhiteSpace(request.ExportFolder) ? "_inbox" : request.ExportFolder,
                AutoTags = request.AutoTags?.ToList() ?? [],
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
            existing.TranscriptionPromptOverride = request.TranscriptionPromptOverride ?? string.Empty;
            existing.OutputTemplate = request.OutputTemplate ?? string.Empty;
            existing.CleanupLevel = request.CleanupLevel;
            existing.ExportFolder = string.IsNullOrWhiteSpace(request.ExportFolder) ? "_inbox" : request.ExportFolder;
            existing.AutoTags = request.AutoTags?.ToList() ?? [];

            if (request.IsDefault && !existing.IsDefault)
            {
                await DemoteCurrentDefaultAsync(repository, ct);
            }
            existing.IsDefault = request.IsDefault;

            await repository.UpdateAsync(existing, ct);
            return Results.Ok(existing);
        });

        endpoints.MapDelete("/api/profiles/{id:guid}", async (
            Guid id,
            IProfileRepository repository,
            CancellationToken ct) =>
        {
            var existing = await repository.GetByIdAsync(id, ct);
            if (existing is null)
            {
                return Results.NotFound();
            }
            if (existing.IsBuiltIn)
            {
                return Results.Conflict(new { error = "Built-in profiles cannot be deleted." });
            }
            var deleted = await repository.DeleteAsync(id, ct);
            return deleted ? Results.NoContent() : Results.Conflict(new { error = "Delete failed." });
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
