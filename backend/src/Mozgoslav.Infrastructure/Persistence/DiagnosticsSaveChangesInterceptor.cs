using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;

namespace Mozgoslav.Infrastructure.Persistence;

public sealed class DiagnosticsSaveChangesInterceptor : SaveChangesInterceptor
{
    private const int MaxValuePreview = 256;

    private readonly ILogger<DiagnosticsSaveChangesInterceptor> _logger;

    public DiagnosticsSaveChangesInterceptor(ILogger<DiagnosticsSaveChangesInterceptor> logger)
    {
        _logger = logger;
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData)
    {
        LogDiagnostics(eventData);
        base.SaveChangesFailed(eventData);
    }

    public override Task SaveChangesFailedAsync(
        DbContextErrorEventData eventData,
        CancellationToken cancellationToken = default)
    {
        LogDiagnostics(eventData);
        return base.SaveChangesFailedAsync(eventData, cancellationToken);
    }

    private void LogDiagnostics(DbContextErrorEventData eventData)
    {
        var context = eventData.Context;
        if (context is null)
        {
            _logger.LogError(
                eventData.Exception,
                "SaveChanges failed but DbContext is null. Caller stack:\n{CallerStack}",
                Environment.StackTrace);
            return;
        }

        var dump = BuildChangeTrackerDump(context.ChangeTracker);

        _logger.LogError(
            eventData.Exception,
            "SaveChanges failed on DbContext {DbContextType}. Caller stack:\n{CallerStack}\n\nChangeTracker snapshot:\n{ChangeTrackerDump}",
            context.GetType().FullName,
            Environment.StackTrace,
            dump);
    }

    private static string BuildChangeTrackerDump(ChangeTracker tracker)
    {
        var dump = new StringBuilder();

        IReadOnlyList<EntityEntry> entries;
        try
        {
            entries = tracker.Entries().ToList();
        }
        catch (Exception ex)
        {
            dump.AppendLine(CultureInfo.InvariantCulture, $"<Entries() itself threw: {ex.GetType().Name}: {ex.Message}>");
            return dump.ToString();
        }

        dump.Append(CultureInfo.InvariantCulture, $"=== {entries.Count} tracked entries ===");
        dump.AppendLine();

        for (var i = 0; i < entries.Count; i++)
        {
            var entry = entries[i];
            AppendEntryHeader(dump, i, entry);
            AppendPrimaryKey(dump, entry);
            AppendInterestingProperties(dump, entry);
        }

        return dump.ToString();
    }

    private static void AppendEntryHeader(StringBuilder dump, int index, EntityEntry entry)
    {
        string entityType;
        try
        {
            entityType = entry.Entity?.GetType().FullName ?? "<null entity>";
        }
        catch (Exception ex)
        {
            entityType = $"<GetType threw: {ex.GetType().Name}>";
        }

        EntityState state;
        try
        {
            state = entry.State;
        }
        catch (Exception ex)
        {
            dump.Append(CultureInfo.InvariantCulture, $"[{index}] Type={entityType} <State threw: {ex.GetType().Name}: {ex.Message}>");
            dump.AppendLine();
            return;
        }

        dump.Append(CultureInfo.InvariantCulture, $"[{index}] Type={entityType} State={state}");
        dump.AppendLine();
    }

    private static void AppendPrimaryKey(StringBuilder dump, EntityEntry entry)
    {
        try
        {
            var pk = entry.Metadata.FindPrimaryKey();
            if (pk is null)
            {
                return;
            }
            var parts = new List<string>(pk.Properties.Count);
            foreach (var property in pk.Properties)
            {
                object? value;
                try
                {
                    value = entry.Property(property.Name).CurrentValue;
                }
                catch (Exception ex)
                {
                    parts.Add($"{property.Name}=<{ex.GetType().Name}>");
                    continue;
                }
                parts.Add($"{property.Name}={Format(value)}");
            }
            dump.Append("    PK: ");
            dump.Append(string.Join(", ", parts));
            dump.AppendLine();
        }
        catch (Exception ex)
        {
            dump.Append(CultureInfo.InvariantCulture, $"    <PK dump threw: {ex.GetType().Name}: {ex.Message}>");
            dump.AppendLine();
        }
    }

    private static void AppendInterestingProperties(StringBuilder dump, EntityEntry entry)
    {
        IReadOnlyList<PropertyEntry> props;
        try
        {
            var state = entry.State;
            props = entry.Properties
                .Where(p => state == EntityState.Added || state == EntityState.Deleted || p.IsModified)
                .ToList();
        }
        catch (Exception ex)
        {
            dump.Append(CultureInfo.InvariantCulture, $"    <Properties enumeration threw: {ex.GetType().Name}: {ex.Message}>");
            dump.AppendLine();
            return;
        }

        foreach (var prop in props)
        {
            string name;
            try
            {
                name = prop.Metadata.Name;
            }
            catch (Exception ex)
            {
                name = $"<metadata threw: {ex.GetType().Name}>";
            }

            string original;
            try
            {
                original = Format(prop.OriginalValue);
            }
            catch (Exception ex)
            {
                original = $"<original threw: {ex.GetType().Name}: {ex.Message}>";
            }

            string current;
            try
            {
                current = Format(prop.CurrentValue);
            }
            catch (Exception ex)
            {
                current = $"<current threw: {ex.GetType().Name}: {ex.Message}>";
            }

            dump.Append(CultureInfo.InvariantCulture, $"    {name}: original={original} current={current}");
            dump.AppendLine();
        }
    }

    private static string Format(object? value)
    {
        if (value is null)
        {
            return "<null>";
        }
        var text = value switch
        {
            string s => s,
            _ => value.ToString() ?? "<null>",
        };
        return text.Length > MaxValuePreview ? text[..MaxValuePreview] + "…" : text;
    }
}
