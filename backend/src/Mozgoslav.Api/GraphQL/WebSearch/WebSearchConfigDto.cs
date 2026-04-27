namespace Mozgoslav.Api.GraphQL.WebSearch;

public sealed record WebSearchConfigDto(
    bool DdgEnabled,
    bool YandexEnabled,
    bool GoogleEnabled,
    int CacheTtlHours,
    string RawSettingsYaml);
