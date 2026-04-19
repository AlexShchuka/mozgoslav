using System.Collections.Generic;

namespace Mozgoslav.Domain.ValueObjects;

/// <summary>
/// Named-entity extraction response from <c>POST /api/ner</c>.
/// All lists are already deduped and case-normalised upstream; callers
/// can treat them as display-ready buckets.
/// </summary>
public sealed record SidecarNerResult(
    IReadOnlyList<string> People,
    IReadOnlyList<string> Orgs,
    IReadOnlyList<string> Locations,
    IReadOnlyList<string> Dates);
