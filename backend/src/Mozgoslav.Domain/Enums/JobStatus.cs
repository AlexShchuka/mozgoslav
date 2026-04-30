using System.Text.Json.Serialization;

namespace Mozgoslav.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<JobStatus>))]
public enum JobStatus
{
    Queued,
    PreflightChecks,
    Transcribing,
    Correcting,
    Summarizing,
    Exporting,
    Done,
    Failed,
    Cancelled
}
