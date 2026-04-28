using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using ModelContextProtocol.Server;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Infrastructure.Mcp.Tools;

[McpServerToolType]
public sealed class NotesMcpTools
{
    private readonly IProcessedNoteRepository _notes;

    public NotesMcpTools(IProcessedNoteRepository notes)
    {
        _notes = notes;
    }

    [McpServerTool(Name = "notes.get")]
    [Description("Retrieve a single processed note by its id.")]
    public async Task<NoteMcpDto?> GetAsync(
        [Description("The note UUID")] string id,
        CancellationToken cancellationToken = default)
    {
        if (!Guid.TryParse(id, out var guid))
        {
            return null;
        }
        var note = await _notes.GetByIdAsync(guid, cancellationToken);
        return note is null ? null : MapToDto(note);
    }

    [McpServerTool(Name = "notes.list")]
    [Description("List processed notes, optionally filtered by date range.")]
    public async Task<IReadOnlyList<NoteMcpDto>> ListAsync(
        [Description("Optional ISO start date (inclusive)")] string? fromDate = null,
        [Description("Optional ISO end date (inclusive)")] string? toDate = null,
        CancellationToken cancellationToken = default)
    {
        var source = DateTimeOffset.TryParse(fromDate, null, DateTimeStyles.RoundtripKind, out var from)
            && DateTimeOffset.TryParse(toDate, null, DateTimeStyles.RoundtripKind, out var to)
            ? await _notes.GetByDateRangeAsync(from, to, cancellationToken)
            : await _notes.GetAllAsync(cancellationToken);

        return source
            .OrderByDescending(n => n.CreatedAt)
            .Select(MapToDto)
            .ToList();
    }

    [McpServerTool(Name = "notes.create")]
    [Description("Create a new processed note with the given markdown text.")]
    public async Task<NoteMcpDto> CreateAsync(
        [Description("Markdown content of the note")] string text,
        CancellationToken cancellationToken = default)
    {
        var note = new ProcessedNote
        {
            Id = Guid.NewGuid(),
            MarkdownContent = text,
        };
        var saved = await _notes.AddAsync(note, cancellationToken);
        return MapToDto(saved);
    }

    private static NoteMcpDto MapToDto(ProcessedNote note) =>
        new(note.Id.ToString(), note.MarkdownContent, note.CreatedAt.ToString("O", CultureInfo.InvariantCulture));
}

public sealed record NoteMcpDto(string Id, string Content, string CreatedAt);
