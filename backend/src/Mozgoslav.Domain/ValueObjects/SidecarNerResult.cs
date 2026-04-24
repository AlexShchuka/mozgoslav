using System.Collections.Generic;

namespace Mozgoslav.Domain.ValueObjects;

public sealed record SidecarNerResult(
    IReadOnlyList<string> People,
    IReadOnlyList<string> Orgs,
    IReadOnlyList<string> Locations,
    IReadOnlyList<string> Dates);
