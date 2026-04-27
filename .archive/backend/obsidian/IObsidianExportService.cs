using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface IObsidianExportService
{
    Task<BulkExportResult> ExportAllUnexportedAsync(CancellationToken ct);
}

public sealed record BulkExportResult(
    int ExportedCount,
    int SkippedCount,
    IReadOnlyList<BulkExportFailure> Failures);

public sealed record BulkExportFailure(Guid NoteId, string Reason);
