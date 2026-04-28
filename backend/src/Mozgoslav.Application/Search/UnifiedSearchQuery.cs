using Mozgoslav.Application.Rag;

namespace Mozgoslav.Application.Search;

public sealed record UnifiedSearchQuery(
    string Query,
    MetadataFilter? Filter,
    bool IncludeWeb);
