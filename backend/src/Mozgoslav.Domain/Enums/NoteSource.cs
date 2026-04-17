using System.Text.Json.Serialization;

namespace Mozgoslav.Domain.Enums;

/// <summary>
/// Where a <see cref="Mozgoslav.Domain.Entities.ProcessedNote"/> came from.
/// Drives two UI concerns: the note-list icon and whether the "open
/// recording" affordance is visible. See ADR-007 §2.6 BC-022.
/// <para>
/// Serialised as its string name over the wire (ADR-007-shared §2.6 —
/// <c>source: "Manual"</c>). The attribute is on this enum specifically,
/// not a global converter, so the rest of the API's numeric enum contract
/// (<see cref="CleanupLevel"/>, <see cref="ConversationType"/>, …) keeps
/// its existing shape and integration tests do not break.
/// </para>
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum NoteSource
{
    /// <summary>Transcribed from a recording, then routed through an LLM profile.</summary>
    Processed,

    /// <summary>User typed this one in by hand via POST /api/notes.</summary>
    Manual,
}
