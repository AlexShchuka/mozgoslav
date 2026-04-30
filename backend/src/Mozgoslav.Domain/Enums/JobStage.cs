using System.Text.Json.Serialization;

namespace Mozgoslav.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<JobStage>))]
public enum JobStage
{
    Transcribing,
    Correcting,
    LlmCorrection,
    Summarizing,
    Exporting
}
