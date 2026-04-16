using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface IProcessedNoteRepository
{
    Task<ProcessedNote> AddAsync(ProcessedNote note, CancellationToken ct);
    Task<ProcessedNote?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<ProcessedNote>> GetByTranscriptIdAsync(Guid transcriptId, CancellationToken ct);
    Task<IReadOnlyList<ProcessedNote>> GetAllAsync(CancellationToken ct);
    Task UpdateAsync(ProcessedNote note, CancellationToken ct);
}
