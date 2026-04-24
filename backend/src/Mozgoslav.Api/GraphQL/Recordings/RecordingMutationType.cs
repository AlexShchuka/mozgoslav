using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using IOPath = System.IO.Path;

using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Api.Services;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Api.GraphQL.Recordings;

[ExtendObjectType(typeof(MutationType))]
public sealed class RecordingMutationType
{
    public async Task<ImportRecordingsPayload> ImportRecordings(
        ImportRecordingsInput input,
        [Service] ImportRecordingUseCase useCase,
        CancellationToken ct)
    {
        if (input.FilePaths.Count == 0)
        {
            return new ImportRecordingsPayload(
                [],
                [new ValidationError("VALIDATION_ERROR", "filePaths must not be empty", "filePaths")]);
        }

        try
        {
            var imported = await useCase.ExecuteAsync(input.FilePaths, input.ProfileId, ct);
            return new ImportRecordingsPayload(imported, []);
        }
        catch (FileNotFoundException ex)
        {
            return new ImportRecordingsPayload([], [new ValidationError("VALIDATION_ERROR", ex.Message, "filePaths")]);
        }
        catch (InvalidOperationException ex)
        {
            return new ImportRecordingsPayload([], [new ValidationError("VALIDATION_ERROR", ex.Message, "filePaths")]);
        }
    }

    public async Task<ImportRecordingsPayload> UploadRecordings(
        UploadRecordingsInput input,
        [Service] ImportRecordingUseCase useCase,
        CancellationToken ct)
    {
        if (input.FilePaths.Count == 0)
        {
            return new ImportRecordingsPayload(
                [],
                [new ValidationError("VALIDATION_ERROR", "filePaths must not be empty", "filePaths")]);
        }

        try
        {
            var imported = await useCase.ExecuteAsync(input.FilePaths, input.ProfileId, ct);
            return new ImportRecordingsPayload(imported, []);
        }
        catch (FileNotFoundException ex)
        {
            return new ImportRecordingsPayload([], [new ValidationError("VALIDATION_ERROR", ex.Message, "filePaths")]);
        }
        catch (InvalidOperationException ex)
        {
            return new ImportRecordingsPayload([], [new ValidationError("VALIDATION_ERROR", ex.Message, "filePaths")]);
        }
    }

    public async Task<RecordingPayload> ReprocessRecording(
        Guid recordingId,
        Guid profileId,
        [Service] ReprocessUseCase useCase,
        CancellationToken ct)
    {
        try
        {
            await useCase.ExecuteAsync(recordingId, profileId, ct);
            return new RecordingPayload(null, []);
        }
        catch (InvalidOperationException ex)
        {
            return new RecordingPayload(null, [new NotFoundError("NOT_FOUND", ex.Message, "Recording", recordingId.ToString())]);
        }
    }

    public async Task<RecordingPayload> DeleteRecording(
        Guid id,
        [Service] IRecordingRepository recordings,
        CancellationToken ct)
    {
        var deleted = await recordings.TryDeleteAsync(id, ct);
        if (!deleted)
        {
            return new RecordingPayload(null, [new NotFoundError("NOT_FOUND", "Recording not found", "Recording", id.ToString())]);
        }
        return new RecordingPayload(null, []);
    }

    public async Task<StartRecordingPayload> StartRecording(
        string? outputPath,
        [Service] IAudioRecorder recorder,
        [Service] RecordingSessionRegistry sessions,
        CancellationToken ct)
    {
        if (!recorder.IsSupported)
        {
            return new StartRecordingPayload(null, null, [new UnavailableError("UNAVAILABLE", "Audio recording is not supported on this platform")]);
        }

        Directory.CreateDirectory(AppPaths.Recordings);
        var resolvedPath = string.IsNullOrWhiteSpace(outputPath)
            ? IOPath.Combine(AppPaths.Recordings, $"recording-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.wav")
            : outputPath;

        if (!sessions.TryStart(resolvedPath, out var session))
        {
            return new StartRecordingPayload(null, null, [new ConflictError("CONFLICT", $"A recording session is already active: {session.SessionId}")]);
        }

        try
        {
            await recorder.StartAsync(session.OutputPath, ct);
            return new StartRecordingPayload(session.SessionId, session.OutputPath, []);
        }
        catch (Exception ex)
        {
            sessions.TryStop(session.SessionId, out _);
            return new StartRecordingPayload(null, null, [new UnavailableError("UNAVAILABLE", ex.Message)]);
        }
    }

    public async Task<StopRecordingPayload> StopRecording(
        string sessionId,
        [Service] IAudioRecorder recorder,
        [Service] RecordingSessionRegistry sessions,
        [Service] ImportRecordingUseCase importUseCase,
        CancellationToken ct)
    {
        if (!sessions.TryStop(sessionId, out _))
        {
            return new StopRecordingPayload(null, [], [new NotFoundError("NOT_FOUND", "No active session with that id.", "RecordingSession", sessionId)]);
        }

        var path = await recorder.StopAsync(ct);
        IReadOnlyList<Domain.Entities.Recording> imported = [];

        try
        {
            imported = await importUseCase.ExecuteAsync([path], null, ct);
        }
        catch
        {
        }

        return new StopRecordingPayload(sessionId, imported, []);
    }
}
