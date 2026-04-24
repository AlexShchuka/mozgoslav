using Mozgoslav.Api.Models;

namespace Mozgoslav.Api.GraphQL.Models;

public sealed record ModelEntry(
    string Id,
    string Name,
    string Description,
    string Url,
    int SizeMb,
    ModelKind Kind,
    ModelTier Tier,
    bool IsDefault,
    string DestinationPath,
    bool Installed);
