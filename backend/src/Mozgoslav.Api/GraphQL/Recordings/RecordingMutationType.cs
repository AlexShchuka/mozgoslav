using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using HotChocolate;
using HotChocolate.Types;
using Mozgoslav.Api.GraphQL.Errors;
using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Api.Services;
using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Domain.Services;
using Mozgoslav.Infrastructure.Platform;
using IOPath = System.IO.Path;

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
        [Service] IRecordingRepository recordings,
        [Service] IDictationSessionManager dictationManager,
        CancellationToken ct)
    {
        if (!recorder.IsSupported)
        {
            return new StartRecordingPayload(null, null, null, null,
                [new UnavailableError("UNAVAILABLE", "Audio recording is not supported on this platform")]);
        }

        Directory.CreateDirectory(AppPaths.Recordings);
        var resolvedPath = string.IsNullOrWhiteSpace(outputPath)
            ? IOPath.Combine(AppPaths.Recordings, $"recording-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.wav")
            : outputPath;

        var recording = new Recording
        {
            FileName = IOPath.GetFileName(resolvedPath),
            FilePath = resolvedPath,
            Sha256 = string.Empty,
            Format = AudioFormat.Wav,
            SourceType = SourceType.Recorded,
            Status = RecordingStatus.New,
            Duration = TimeSpan.Zero
        };
        await recordings.AddAsync(recording, ct);

        var dictationSession = dictationManager.Start(
            source: $"recording-{recording.Id:N}",
            kind: DictationSessionKind.Longform,
            recordingId: recording.Id);

        if (!sessions.TryStart(recording.Id, dictationSession.Id, resolvedPath, out var session))
        {
            await dictationManager.CancelAsync(dictationSession.Id, ct);
            return new StartRecordingPayload(null, null, null, null,
                [new ConflictError("CONFLICT", $"A recording session is already active: {session.SessionId}")]);
        }

        try
        {
            await recorder.StartAsync(session.OutputPath, dictationSession.Id, ct);
            return new StartRecordingPayload(session.SessionId, recording.Id, dictationSession.Id, session.OutputPath, []);
        }
        catch (Exception ex)
        {
            sessions.TryStop(session.SessionId, out _);
            await dictationManager.CancelAsync(dictationSession.Id, ct);
            return new StartRecordingPayload(null, null, null, null, [new UnavailableError("UNAVAILABLE", ex.Message)]);
        }
    }

    public async Task<StopRecordingPayload> StopRecording(
        string sessionId,
        [Service] IAudioRecorder recorder,
        [Service] RecordingSessionRegistry sessions,
        [Service] IRecordingRepository recordings,
        [Service] IProcessingJobRepository jobs,
        [Service] IProcessingJobScheduler scheduler,
        [Service] IProfileRepository profiles,
        [Service] IDictationSessionManager dictationManager,
        [Service] IAudioMetadataProbe? metadataProbe,
        CancellationToken ct)
    {
        if (!sessions.TryStop(sessionId, out var session))
        {
            return new StopRecordingPayload(null, [], [new NotFoundError("NOT_FOUND", "No active session with that id.", "RecordingSession", sessionId)]);
        }

        var path = await recorder.StopAsync(ct);

        if (session is not null)
        {
            try
            {
                await dictationManager.CancelAsync(session.DictationSessionId, ct);
            }
            catch (Exception)
            {
            }
        }

        var recording = session is null
            ? null
            : await recordings.GetByIdAsync(session.RecordingId, ct);

        if (recording is null)
        {
            return new StopRecordingPayload(sessionId, [], []);
        }

        if (!File.Exists(path))
        {
            recording.Status = RecordingStatus.Failed;
            await recordings.UpdateAsync(recording, ct);
            return new StopRecordingPayload(sessionId, [recording],
                [new UnavailableError("UNAVAILABLE", $"Recorder produced no file at {path}.")]);
        }

        var sha256 = await HashCalculator.Sha256Async(path, ct);
        var duration = metadataProbe is not null
            ? await metadataProbe.GetDurationAsync(path, ct)
            : TimeSpan.Zero;

        var updated = new Recording
        {
            Id = recording.Id,
            FileName = IOPath.GetFileName(path),
            FilePath = path,
            Sha256 = sha256,
            Duration = duration,
            Format = AudioFormat.Wav,
            SourceType = SourceType.Recorded,
            Status = RecordingStatus.Transcribing,
            CreatedAt = recording.CreatedAt
        };
        await recordings.UpdateAsync(updated, ct);

        var profile = await profiles.TryGetDefaultAsync(ct)
            ?? throw new InvalidOperationException("No default profile configured");

        var job = await jobs.EnqueueAsync(
            new ProcessingJob
            {
                RecordingId = updated.Id,
                ProfileId = profile.Id
            },
            ct);
        await scheduler.ScheduleAsync(job.Id, ct);

        return new StopRecordingPayload(sessionId, [updated], []);
    }
}
