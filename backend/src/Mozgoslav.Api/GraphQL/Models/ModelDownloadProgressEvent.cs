namespace Mozgoslav.Api.GraphQL.Models;

public sealed record ModelDownloadProgressEvent(
    string DownloadId,
    long BytesRead,
    long? TotalBytes,
    bool Done,
    string? Error);
