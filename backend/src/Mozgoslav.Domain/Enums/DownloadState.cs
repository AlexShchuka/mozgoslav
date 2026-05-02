namespace Mozgoslav.Domain.Enums;

public enum DownloadState
{
    Queued,
    Downloading,
    Finalizing,
    Completed,
    Failed,
    Cancelled,
}
