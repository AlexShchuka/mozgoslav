using System.Collections.Generic;

using Mozgoslav.Api.GraphQL.Errors;

namespace Mozgoslav.Api.GraphQL.Rag;

public sealed record RagReindexPayload(
    int? EmbeddedNotes,
    int? Chunks,
    IReadOnlyList<IUserError> Errors);
