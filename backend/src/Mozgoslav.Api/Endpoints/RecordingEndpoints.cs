using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Api.Endpoints;

public static class RecordingEndpoints
{
    private sealed record ImportByPathRequest(IReadOnlyList<string> FilePaths, Guid? ProfileId);

    private sealed record StartRecordingRequest(string? OutputPath);

    private sealed record ActiveSession(string SessionId, string OutputPath, DateTime StartedAtUtc);

    /// <summary>
    /// In-memory bookkeeping for the currently-active native recording session.
    /// We keep a single slot because the native helper does not support
    /// multiplexing; attempting a concurrent start returns 409.
    /// </summary>
    private static ActiveSession? _activeSession;
    private static readonly Lock ActiveSessionLock = new();

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

        endpoints.MapGet("/api/audio/capabilities", (IAudioRecorder recorder) =>
        {
            return Results.Ok(new
            {
                isSupported = recorder.IsSupported,
                detectedPlatform = OperatingSystem.IsMacOS()
                    ? "macos"
                    : OperatingSystem.IsLinux()
                        ? "linux"
                        : OperatingSystem.IsWindows()
                            ? "windows"
                            : "other",
                permissionsRequired = OperatingSystem.IsMacOS() ? ["microphone"] : Array.Empty<string>()
            });
        });

        endpoints.MapPost("/api/recordings/start", async (
            StartRecordingRequest request,
            IAudioRecorder recorder,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            var log = loggerFactory.CreateLogger("RecordingEndpoints");
            if (!recorder.IsSupported)
            {
                return Results.StatusCode(501);
            }
            lock (ActiveSessionLock)
            {
                if (_activeSession is not null)
                {
                    return Results.Conflict(new { error = "A recording session is already active.", sessionId = _activeSession.SessionId });
                }
            }

            Directory.CreateDirectory(AppPaths.Recordings);
            var outputPath = string.IsNullOrWhiteSpace(request.OutputPath)
                ? Path.Combine(AppPaths.Recordings, $"recording-{DateTime.UtcNow:yyyyMMdd-HHmmss}-{Guid.NewGuid():N}.wav")
                : request.OutputPath!;

            var sessionId = Guid.NewGuid().ToString("N");
            var started = new ActiveSession(sessionId, outputPath, DateTime.UtcNow);
            lock (ActiveSessionLock)
            {
                _activeSession = started;
            }

            log.LogInformation(
                "D1 handoff: /api/recordings/start sessionId={SessionId} outputPath={OutputPath}",
                sessionId, outputPath);
            return await StartAsync(recorder, started, ct);
        });

        endpoints.MapPost("/api/recordings/stop/{sessionId}", async (
            string sessionId,
            IAudioRecorder recorder,
            ImportRecordingUseCase importUseCase,
            ILoggerFactory loggerFactory,
            CancellationToken ct) =>
        {
            var log = loggerFactory.CreateLogger("RecordingEndpoints");
            ActiveSession? snapshot;
            lock (ActiveSessionLock)
            {
                snapshot = _activeSession;
                if (snapshot is null || !string.Equals(snapshot.SessionId, sessionId, StringComparison.Ordinal))
                {
                    return Results.NotFound(new { error = "No active session with that id." });
                }
                _activeSession = null;
            }

            var path = await recorder.StopAsync(ct);
            long size = -1;
            try
            {
                if (File.Exists(path)) size = new FileInfo(path).Length;
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                log.LogWarning(ex, "D1 handoff: cannot stat {Path} before import", path);
            }
            log.LogInformation(
                "D1 handoff: /api/recordings/stop sessionId={SessionId} path={Path} size={Size}b",
                sessionId, path, size);
            var imported = await importUseCase.ExecuteAsync([path], null, ct);
            return Results.Ok(new
            {
                sessionId,
                path,
                recordings = imported,
            });
        });

        return endpoints;
    }

    private static async Task<IResult> StartAsync(IAudioRecorder recorder, ActiveSession session, CancellationToken ct)
    {
        try
        {
            await recorder.StartAsync(session.OutputPath, ct);
            return Results.Ok(new { sessionId = session.SessionId, outputPath = session.OutputPath });
        }
        catch (Exception ex)
        {
            lock (ActiveSessionLock)
            {
                if (ReferenceEquals(_activeSession, session))
                {
                    _activeSession = null;
                }
            }
            return Results.BadRequest(new { error = ex.Message });
        }
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
