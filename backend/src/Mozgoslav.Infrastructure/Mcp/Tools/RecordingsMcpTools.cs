using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using ModelContextProtocol.Server;

using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Infrastructure.Mcp.Tools;

[McpServerToolType]
public sealed class RecordingsMcpTools
{
    private readonly IRecordingRepository _recordings;

    public RecordingsMcpTools(IRecordingRepository recordings)
    {
        _recordings = recordings;
    }

    [McpServerTool(Name = "recordings.search")]
    [Description("List all recordings or filter by date range. Returns recording id, filename, duration and status.")]
    public async Task<IReadOnlyList<RecordingMcpDto>> SearchAsync(
        [Description("Optional ISO start date (inclusive), e.g. 2026-01-01")] string? fromDate = null,
        [Description("Optional ISO end date (inclusive), e.g. 2026-12-31")] string? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var all = await _recordings.GetAllAsync(cancellationToken);
        var filtered = all.AsEnumerable();

        if (DateTime.TryParse(fromDate, out var from))
        {
            filtered = filtered.Where(r => r.CreatedAt >= from);
        }

        if (DateTime.TryParse(toDate, out var to))
        {
            filtered = filtered.Where(r => r.CreatedAt <= to);
        }

        return filtered
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new RecordingMcpDto(
                r.Id.ToString(),
                r.FileName,
                (int)r.Duration.TotalSeconds,
                r.Status.ToString(),
                r.CreatedAt.ToString("O", CultureInfo.InvariantCulture)))
            .ToList();
    }
}

public sealed record RecordingMcpDto(
    string Id,
    string FileName,
    int DurationSeconds,
    string Status,
    string CreatedAt);
