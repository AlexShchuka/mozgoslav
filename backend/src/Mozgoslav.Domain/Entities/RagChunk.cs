using System;

namespace Mozgoslav.Domain.Entities;

public sealed class RagChunk
{
    public string Id { get; set; } = string.Empty;
    public Guid NoteId { get; set; }
    public string Text { get; set; } = string.Empty;
    public byte[] Embedding { get; set; } = Array.Empty<byte>();
    public int Dimensions { get; set; }
    public string Schema { get; set; } = "v1";
}
