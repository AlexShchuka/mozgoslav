using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;

using Mozgoslav.Application.Prompts;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Infrastructure.Prompts;

public sealed class PromptTemplateRepository : IPromptTemplateRepository
{
    private readonly MozgoslavDbContext _db;

    public PromptTemplateRepository(MozgoslavDbContext db)
    {
        _db = db;
    }

    public async Task<PromptTemplate> AddAsync(PromptTemplate promptTemplate, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(promptTemplate);
        var entity = ToEntity(promptTemplate);
        _db.Set<PromptTemplateEntity>().Add(entity);
        await _db.SaveChangesAsync(ct);
        return FromEntity(entity);
    }

    public async Task<PromptTemplate?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await _db.Set<PromptTemplateEntity>()
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == id, ct);
        return entity is null ? null : FromEntity(entity);
    }

    public async Task<IReadOnlyList<PromptTemplate>> GetAllAsync(CancellationToken ct)
    {
        var entities = await _db.Set<PromptTemplateEntity>()
            .AsNoTracking()
            .OrderBy(e => e.Name)
            .ToListAsync(ct);
        return entities.Select(FromEntity).ToList();
    }

    public async Task UpdateAsync(PromptTemplate promptTemplate, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(promptTemplate);
        var entity = await _db.Set<PromptTemplateEntity>()
            .FirstOrDefaultAsync(e => e.Id == promptTemplate.Id, ct);
        if (entity is null)
        {
            return;
        }
        entity.Name = promptTemplate.Name;
        entity.Body = promptTemplate.Body;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> TryDeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await _db.Set<PromptTemplateEntity>()
            .FirstOrDefaultAsync(e => e.Id == id, ct);
        if (entity is null)
        {
            return false;
        }
        _db.Set<PromptTemplateEntity>().Remove(entity);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    private static PromptTemplateEntity ToEntity(PromptTemplate t) => new()
    {
        Id = t.Id,
        Name = t.Name,
        Body = t.Body,
        CreatedAt = t.CreatedAt,
    };

    private static PromptTemplate FromEntity(PromptTemplateEntity e) =>
        new(e.Id, e.Name, e.Body, e.CreatedAt);
}
