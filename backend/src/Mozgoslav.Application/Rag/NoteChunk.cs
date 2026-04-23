using System;

namespace Mozgoslav.Application.Rag;

public sealed record NoteChunk(
    string Id,
    Guid NoteId,
    string Text,
    float[] Embedding);

public sealed record NoteChunkHit(NoteChunk Chunk, double Score);
