using System;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Entities;

public sealed class DownloadJob
{
    public Guid Id { get; set; }
    public string CatalogueId { get; set; } = string.Empty;
    public string SourceUrl { get; set; } = string.Empty;
    public string DestinationPath { get; set; } = string.Empty;
    public DownloadState State { get; set; }
    public long BytesReceived { get; set; }
    public long? TotalBytes { get; set; }
    public string? ExpectedSha256 { get; set; }
    public DownloadErrorKind? ErrorKind { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }
}
