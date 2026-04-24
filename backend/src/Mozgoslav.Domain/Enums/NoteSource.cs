using System.Text.Json.Serialization;

namespace Mozgoslav.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NoteSource
{
    Processed,

    Manual,
}
