using System.Text.Json.Serialization;

namespace Mozgoslav.Domain.Enums;

// Task #17 — serialise as "Queued" / "Failed" / … on the wire so the UI can
// key i18n lookups off the name (queue.status.Queued) instead of the ordinal.
// Other enums keep the default int shape — their tests deserialise with the
// default converter and would break under a global switch.
[JsonConverter(typeof(JsonStringEnumConverter<JobStatus>))]
public enum JobStatus
{
    Queued,
    Transcribing,
    Correcting,
    Summarizing,
    Exporting,
    Done,
    Failed,
    // ADR-015 — terminal state for user-initiated cancellation. Placed last so
    // any caller that still reads the int ordinal (EF converter uses the name
    // so not affected, but defence in depth) sees the historical values pinned.
    Cancelled
}
