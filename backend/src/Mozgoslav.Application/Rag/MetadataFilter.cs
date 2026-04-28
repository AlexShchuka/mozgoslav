using System;
using System.Collections.Generic;

namespace Mozgoslav.Application.Rag;

public sealed record MetadataFilter(
    DateTimeOffset? FromUtc,
    DateTimeOffset? ToUtc,
    IReadOnlyList<string>? ProfileIds,
    IReadOnlyList<string>? SpeakerIds);
