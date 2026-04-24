using System.Collections.Generic;

namespace Mozgoslav.Api.GraphQL.Rag;

public sealed record RagQueryResult(
    string Answer,
    IReadOnlyList<RagCitation> Citations,
    bool LlmAvailable);
