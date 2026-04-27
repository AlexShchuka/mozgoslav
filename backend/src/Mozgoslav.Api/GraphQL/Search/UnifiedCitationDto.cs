namespace Mozgoslav.Api.GraphQL.Search;

public sealed record UnifiedCitationDto(
    string Source,
    string Reference,
    string Snippet,
    string? Url);
