using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.GraphQL.Notes;

[ExtendObjectType(typeof(MutationType))]
public sealed class NoteMutationType
{
    public async Task<NotePayload> DeleteNote(
        Guid id,
        [Service] IProcessedNoteRepository notes,
        CancellationToken ct)
    {
        var deleted = await notes.TryDeleteAsync(id, ct);
        if (!deleted)
        {
            return new NotePayload(null, [new NotFoundError("NOT_FOUND", "Note not found", "ProcessedNote", id.ToString())]);
        }
        return new NotePayload(null, []);
    }

    public async Task<NotePayload> CreateNote(
        CreateNoteInput input,
        [Service] IProcessedNoteRepository notes,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.Title))
        {
            return new NotePayload(null, [new ValidationError("VALIDATION_ERROR", "title must not be empty", "title")]);
        }

        var note = new ProcessedNote
        {
            Source = NoteSource.Manual,
            Title = input.Title,
            MarkdownContent = input.Body ?? string.Empty,
        };

        var saved = await notes.AddAsync(note, ct);
        return new NotePayload(saved, []);
    }

    public async Task<NotePayload> ExportNote(
        Guid id,
        [Service] IProcessedNoteRepository notes,
        [Service] IProfileRepository profiles,
        [Service] ITranscriptRepository transcripts,
        [Service] IRecordingRepository recordings,
        [Service] IMarkdownExporter exporter,
        [Service] IAppSettings settings,
        CancellationToken ct)
    {
        var note = await notes.GetByIdAsync(id, ct);
        if (note is null)
        {
            return new NotePayload(null, [new NotFoundError("NOT_FOUND", "Note not found", "ProcessedNote", id.ToString())]);
        }

        if (string.IsNullOrWhiteSpace(settings.VaultPath))
        {
            return new NotePayload(null, [new UnavailableError("UNAVAILABLE", "Vault path is not configured")]);
        }

        var profile = await profiles.GetByIdAsync(note.ProfileId, ct);
        if (profile is null)
        {
            return new NotePayload(null, [new NotFoundError("NOT_FOUND", "Profile not found", "Profile", note.ProfileId.ToString())]);
        }

        var transcript = await transcripts.GetByIdAsync(note.TranscriptId, ct);
        if (transcript is null)
        {
            return new NotePayload(null, [new NotFoundError("NOT_FOUND", "Transcript not found", "Transcript", note.TranscriptId.ToString())]);
        }

        var recording = await recordings.GetByIdAsync(transcript.RecordingId, ct);
        if (recording is null)
        {
            return new NotePayload(null, [new NotFoundError("NOT_FOUND", "Recording not found", "Recording", transcript.RecordingId.ToString())]);
        }

        try
        {
            note.VaultPath = await exporter.ExportAsync(note, profile, settings.VaultPath, ct);
            note.ExportedToVault = true;
            await notes.UpdateAsync(note, ct);
            return new NotePayload(note, []);
        }
        catch (Exception ex)
        {
            return new NotePayload(null, [new UnavailableError("UNAVAILABLE", ex.Message)]);
        }
    }
}
