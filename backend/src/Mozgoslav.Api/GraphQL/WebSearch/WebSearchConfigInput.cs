namespace Mozgoslav.Api.GraphQL.WebSearch;

public sealed record WebSearchConfigInput(
    bool DdgEnabled,
    bool YandexEnabled,
    bool GoogleEnabled,
    int CacheTtlHours);
