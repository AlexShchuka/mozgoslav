using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface IProcessedNoteRepository
{
    Task<ProcessedNote> AddAsync(ProcessedNote note, CancellationToken ct);
    Task<ProcessedNote?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<ProcessedNote>> GetByTranscriptIdAsync(Guid transcriptId, CancellationToken ct);
    Task<IReadOnlyList<ProcessedNote>> GetByRecordingIdsAsync(IReadOnlyList<Guid> recordingIds, CancellationToken ct);
    Task<IReadOnlyList<ProcessedNote>> GetAllAsync(CancellationToken ct);
    Task<IReadOnlyList<ProcessedNote>> GetByIdsAsync(IReadOnlyList<Guid> ids, CancellationToken ct);
    Task UpdateAsync(ProcessedNote note, CancellationToken ct);
    Task<bool> TryDeleteAsync(Guid id, CancellationToken ct);
}
