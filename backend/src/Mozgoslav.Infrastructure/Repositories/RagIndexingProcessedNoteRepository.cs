using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Rag;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Infrastructure.Repositories;

public sealed class RagIndexingProcessedNoteRepository : IProcessedNoteRepository
{
    private readonly IProcessedNoteRepository _inner;
    private readonly IRagService _rag;
    private readonly ILogger<RagIndexingProcessedNoteRepository> _logger;

    public RagIndexingProcessedNoteRepository(
        IProcessedNoteRepository inner,
        IRagService rag,
        ILogger<RagIndexingProcessedNoteRepository> logger)
    {
        _inner = inner;
        _rag = rag;
        _logger = logger;
    }

    public async Task<ProcessedNote> AddAsync(ProcessedNote note, CancellationToken ct)
    {
        var saved = await _inner.AddAsync(note, ct);
        await SafeIndexAsync(saved, ct);
        return saved;
    }

    public Task<ProcessedNote?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        return _inner.GetByIdAsync(id, ct);
    }

    public Task<IReadOnlyList<ProcessedNote>> GetByTranscriptIdAsync(Guid transcriptId, CancellationToken ct)
    {
        return _inner.GetByTranscriptIdAsync(transcriptId, ct);
    }

    public Task<IReadOnlyList<ProcessedNote>> GetByRecordingIdsAsync(IReadOnlyList<Guid> recordingIds, CancellationToken ct)
    {
        return _inner.GetByRecordingIdsAsync(recordingIds, ct);
    }

    public Task<IReadOnlyList<ProcessedNote>> GetAllAsync(CancellationToken ct)
    {
        return _inner.GetAllAsync(ct);
    }

    public Task<IReadOnlyList<ProcessedNote>> GetByDateRangeAsync(DateTimeOffset fromUtc, DateTimeOffset toUtc, CancellationToken ct)
    {
        return _inner.GetByDateRangeAsync(fromUtc, toUtc, ct);
    }

    public Task<IReadOnlyList<ProcessedNote>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct)
    {
        return _inner.GetByIdsAsync(ids, ct);
    }

    public async Task UpdateAsync(ProcessedNote note, CancellationToken ct)
    {
        await _inner.UpdateAsync(note, ct);
        await SafeIndexAsync(note, ct);
    }

    public async Task<bool> TryDeleteAsync(Guid id, CancellationToken ct)
    {
        var deleted = await _inner.TryDeleteAsync(id, ct);
        if (deleted)
        {
            await SafeDeindexAsync(id, ct);
        }
        return deleted;
    }

    private async Task SafeIndexAsync(ProcessedNote note, CancellationToken ct)
    {
        try
        {
            await _rag.IndexAsync(note, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "RAG auto-index failed for note {NoteId}; the note was saved but is not searchable until the next /api/rag/reindex",
                note.Id);
        }
    }

    private async Task SafeDeindexAsync(Guid noteId, CancellationToken ct)
    {
        try
        {
            await _rag.DeindexAsync(noteId, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "RAG auto-deindex failed for note {NoteId}; stale chunks may linger until the next /api/rag/reindex",
                noteId);
        }
    }
}
