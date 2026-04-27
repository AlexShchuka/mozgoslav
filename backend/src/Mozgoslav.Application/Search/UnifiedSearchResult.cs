using System.Collections.Generic;

namespace Mozgoslav.Application.Search;

public sealed record UnifiedSearchResult(
    string Answer,
    IReadOnlyList<UnifiedCitation> Citations);
