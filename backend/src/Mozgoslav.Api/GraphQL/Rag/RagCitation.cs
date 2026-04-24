using System;

namespace Mozgoslav.Api.GraphQL.Rag;

public sealed record RagCitation(
    Guid NoteId,
    string SegmentId,
    string Text,
    string Snippet);
