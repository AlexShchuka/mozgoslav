namespace Mozgoslav.Domain.Enums;

public enum JobStatus
{
    Queued,
    Transcribing,
    Correcting,
    Summarizing,
    Exporting,
    Done,
    Failed
}
