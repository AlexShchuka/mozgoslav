using System;

namespace Mozgoslav.Api.GraphQL.Recordings;

public static class RecordingPartialsTopics
{
    public static string ForRecording(Guid recordingId) => $"RecordingPartials:{recordingId}";
}
