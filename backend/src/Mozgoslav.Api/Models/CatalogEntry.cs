namespace Mozgoslav.Api.Models;

public sealed record CatalogEntry(
    string Id,
    string Name,
    string Description,
    string Url,
    int SizeMb,
    ModelKind Kind,
    ModelTier Tier,
    bool IsDefault);
