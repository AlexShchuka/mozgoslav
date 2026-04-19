using System;

namespace Mozgoslav.Application.Rag;

/// <summary>
/// ADR-005 — a single indexable piece of a note. Chunks are usually a
/// paragraph (or a bounded window of paragraphs) of the source markdown.
/// The <see cref="Embedding"/> is produced by <see cref="IEmbeddingService"/>
/// and consumed by <see cref="IVectorIndex"/>; both live 100 % locally.
/// </summary>
public sealed record NoteChunk(
    string Id,
    Guid NoteId,
    string Text,
    float[] Embedding);

/// <summary>A scored chunk returned by a similarity search.</summary>
public sealed record NoteChunkHit(NoteChunk Chunk, double Score);
