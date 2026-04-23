using System;

namespace Mozgoslav.Domain.Entities;

/// <summary>
/// ADR-005 — persistent RAG chunk row. Holds the embedding as a raw
/// little-endian <c>float32</c> byte blob (length = <c>Dimensions * 4</c>);
/// <c>SqliteVectorIndex</c> owns the read/write logic and keeps this entity
/// free of EF navigation concerns.
/// </summary>
public sealed class RagChunk
{
    public string Id { get; set; } = string.Empty;
    public Guid NoteId { get; set; }
    public string Text { get; set; } = string.Empty;
    public byte[] Embedding { get; set; } = Array.Empty<byte>();
    public int Dimensions { get; set; }
    public string Schema { get; set; } = "v1";
}
