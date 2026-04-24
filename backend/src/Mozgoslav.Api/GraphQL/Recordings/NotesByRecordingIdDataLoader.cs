using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using GreenDonut;

using Microsoft.EntityFrameworkCore;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Persistence;

namespace Mozgoslav.Api.GraphQL.Recordings;

public sealed class NotesByRecordingIdDataLoader : BatchDataLoader<Guid, IReadOnlyList<ProcessedNote>>
{
    private readonly MozgoslavDbContext _db;

    public NotesByRecordingIdDataLoader(
        MozgoslavDbContext db,
        IBatchScheduler batchScheduler,
        DataLoaderOptions options)
        : base(batchScheduler, options)
    {
        _db = db;
    }

    protected override async Task<IReadOnlyDictionary<Guid, IReadOnlyList<ProcessedNote>>> LoadBatchAsync(
        IReadOnlyList<Guid> keys,
        CancellationToken cancellationToken)
    {
        var results = await _db.ProcessedNotes.AsNoTracking()
            .Join(
                _db.Transcripts.AsNoTracking().Where(t => keys.Contains(t.RecordingId)),
                note => note.TranscriptId,
                transcript => transcript.Id,
                (note, transcript) => new { Note = note, transcript.RecordingId })
            .ToListAsync(cancellationToken);

        var grouped = results
            .GroupBy(r => r.RecordingId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<ProcessedNote>)g.Select(r => r.Note).ToList());

        foreach (var key in keys)
        {
            if (!grouped.ContainsKey(key))
            {
                grouped[key] = [];
            }
        }

        return grouped;
    }
}
