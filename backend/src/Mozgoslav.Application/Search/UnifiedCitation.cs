namespace Mozgoslav.Application.Search;

public sealed record UnifiedCitation(
    SourceType Source,
    string Reference,
    string Snippet,
    string? Url);
