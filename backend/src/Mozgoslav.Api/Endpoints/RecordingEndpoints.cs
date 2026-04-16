using Microsoft.AspNetCore.Mvc;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Api.Endpoints;

public static class RecordingEndpoints
{
    private sealed record ImportByPathRequest(IReadOnlyList<string> FilePaths, Guid? ProfileId);

    public static IEndpointRouteBuilder MapRecordingEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/recordings", async (
            IRecordingRepository repository,
            CancellationToken ct) =>
        {
            var recordings = await repository.GetAllAsync(ct);
            return Results.Ok(recordings);
        });

        endpoints.MapGet("/api/recordings/{id:guid}", async (
            Guid id,
            IRecordingRepository repository,
            CancellationToken ct) =>
        {
            var recording = await repository.GetByIdAsync(id, ct);
            return recording is null ? Results.NotFound() : Results.Ok(recording);
        });

        endpoints.MapPost("/api/recordings/import", async (
            ImportByPathRequest request,
            ImportRecordingUseCase useCase,
            CancellationToken ct) =>
        {
            if (request.FilePaths.Count == 0)
            {
                return Results.BadRequest(new { error = "filePaths is required" });
            }

            return await ExecuteImportAsync(useCase, request.FilePaths, request.ProfileId, ct);
        });

        endpoints.MapPost("/api/recordings/upload", async (
            [FromForm] IFormFileCollection files,
            [FromForm] Guid? profileId,
            ImportRecordingUseCase useCase,
            CancellationToken ct) =>
        {
            if (files.Count == 0)
            {
                return Results.BadRequest(new { error = "No files uploaded" });
            }

            Directory.CreateDirectory(AppPaths.Temp);
            var savedPaths = new List<string>();

            foreach (var file in files)
            {
                if (file.Length == 0)
                {
                    continue;
                }

                var safeName = Path.GetFileName(file.FileName);
                var target = Path.Combine(AppPaths.Temp, $"{Guid.NewGuid():N}_{safeName}");

                await using (var stream = File.Create(target))
                {
                    await file.CopyToAsync(stream, ct);
                }
                savedPaths.Add(target);
            }

            return await ExecuteImportAsync(useCase, savedPaths, profileId, ct);
        }).DisableAntiforgery();

        return endpoints;
    }

    private static async Task<IResult> ExecuteImportAsync(
        ImportRecordingUseCase useCase,
        IReadOnlyList<string> filePaths,
        Guid? profileId,
        CancellationToken ct)
    {
        try
        {
            var imported = await useCase.ExecuteAsync(filePaths, profileId, ct);
            return Results.Ok(imported);
        }
        catch (FileNotFoundException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Results.BadRequest(new { error = ex.Message });
        }
    }
}
