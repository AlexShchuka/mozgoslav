using System.Collections.Generic;

namespace Mozgoslav.Api.GraphQL.Search;

public sealed record UnifiedSearchPayload(
    string Answer,
    IReadOnlyList<UnifiedCitationDto> Citations);
