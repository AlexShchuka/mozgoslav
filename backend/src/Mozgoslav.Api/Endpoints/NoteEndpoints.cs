using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.Endpoints;

public static class NoteEndpoints
{
    public sealed record ReprocessRequest(Guid ProfileId);

    /// <summary>
    /// ADR-007-shared §2.6 BC-022 — payload accepted by the manual-note
    /// endpoint. All fields are optional; absence means "empty stub that the
    /// user will fill in via the editor".
    /// </summary>
    public sealed record ManualNoteRequest(string? Title, string? Body, string? TemplateId);

    public static IEndpointRouteBuilder MapNoteEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/notes", async (
            IProcessedNoteRepository repository,
            CancellationToken ct) =>
        {
            var notes = await repository.GetAllAsync(ct);
            return Results.Ok(notes);
        });

        endpoints.MapPost("/api/notes", async (
            ManualNoteRequest? request,
            IProcessedNoteRepository repository,
            CancellationToken ct) =>
        {
            var note = new ProcessedNote
            {
                Source = NoteSource.Manual,
                Title = request?.Title ?? string.Empty,
                MarkdownContent = request?.Body ?? string.Empty,
            };
            await repository.AddAsync(note, ct);
            return Results.Created($"/api/notes/{note.Id}", note);
        });

        endpoints.MapGet("/api/notes/{id:guid}", async (
            Guid id,
            IProcessedNoteRepository repository,
            CancellationToken ct) =>
        {
            var note = await repository.GetByIdAsync(id, ct);
            return note is null ? Results.NotFound() : Results.Ok(note);
        });

        endpoints.MapGet("/api/recordings/{recordingId:guid}/notes", async (
            Guid recordingId,
            IProcessedNoteRepository noteRepo,
            ITranscriptRepository transcriptRepo,
            CancellationToken ct) =>
        {
            var transcript = await transcriptRepo.GetByRecordingIdAsync(recordingId, ct);
            if (transcript is null)
            {
                return Results.Ok(Array.Empty<object>());
            }
            var notes = await noteRepo.GetByTranscriptIdAsync(transcript.Id, ct);
            return Results.Ok(notes);
        });

        endpoints.MapPost("/api/recordings/{recordingId:guid}/reprocess", async (
            Guid recordingId,
            ReprocessRequest request,
            ReprocessUseCase useCase,
            CancellationToken ct) =>
        {
            try
            {
                var note = await useCase.ExecuteAsync(recordingId, request.ProfileId, ct);
                return Results.Ok(note);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        endpoints.MapPost("/api/notes/{id:guid}/export", async (
            Guid id,
            IProcessedNoteRepository notes,
            IProfileRepository profiles,
            ITranscriptRepository transcripts,
            IRecordingRepository recordings,
            IMarkdownExporter exporter,
            IAppSettings settings,
            CancellationToken ct) =>
        {
            var note = await notes.GetByIdAsync(id, ct);
            if (note is null)
            {
                return Results.NotFound();
            }

            var profile = await profiles.GetByIdAsync(note.ProfileId, ct);
            if (profile is null)
            {
                return Results.BadRequest(new { error = "Profile missing" });
            }

            var transcript = await transcripts.GetByIdAsync(note.TranscriptId, ct);
            if (transcript is null)
            {
                return Results.BadRequest(new { error = "Transcript missing" });
            }

            var recording = await recordings.GetByIdAsync(transcript.RecordingId, ct);
            if (recording is null)
            {
                return Results.BadRequest(new { error = "Recording missing" });
            }

            if (string.IsNullOrWhiteSpace(settings.VaultPath))
            {
                return Results.BadRequest(new { error = "Vault path is not configured" });
            }

            try
            {
                note.VaultPath = await exporter.ExportAsync(note, profile, settings.VaultPath, ct);
                note.ExportedToVault = true;
                await notes.UpdateAsync(note, ct);
                return Results.Ok(note);
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { error = ex.Message });
            }
        });

        return endpoints;
    }
}
