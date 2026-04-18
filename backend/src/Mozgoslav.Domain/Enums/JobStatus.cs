namespace Mozgoslav.Domain.Enums;

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
