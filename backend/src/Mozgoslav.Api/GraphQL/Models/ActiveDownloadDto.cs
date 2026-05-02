using System;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.GraphQL.Models;

public sealed record ActiveDownloadDto(
    string Id,
    string CatalogueId,
    DownloadState State,
    long BytesReceived,
    long? TotalBytes,
    double? SpeedBytesPerSecond,
    string? ErrorMessage,
    DateTimeOffset? StartedAt);
