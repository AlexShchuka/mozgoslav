using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.GraphQL.Models;

public sealed record ModelDownloadProgressEvent(
    string DownloadId,
    long BytesRead,
    long? TotalBytes,
    DownloadState Phase,
    double? SpeedBytesPerSecond,
    string? Error);
