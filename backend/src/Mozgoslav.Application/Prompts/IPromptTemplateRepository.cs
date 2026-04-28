using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Prompts;

public interface IPromptTemplateRepository
{
    Task<PromptTemplate> AddAsync(PromptTemplate promptTemplate, CancellationToken ct);
    Task<PromptTemplate?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<PromptTemplate>> GetAllAsync(CancellationToken ct);
    Task UpdateAsync(PromptTemplate promptTemplate, CancellationToken ct);
    Task<bool> TryDeleteAsync(Guid id, CancellationToken ct);
}
