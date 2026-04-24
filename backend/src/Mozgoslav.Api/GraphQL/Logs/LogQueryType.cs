using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Api.GraphQL.Logs;

[ExtendObjectType(typeof(QueryType))]
public sealed class LogQueryType
{
    public LogFileEntry[] Logs()
    {
        var directory = new DirectoryInfo(AppPaths.Logs);
        if (!directory.Exists)
        {
            return [];
        }
        return directory.GetFiles("*.log")
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .Select(f => new LogFileEntry(f.Name, f.Length, f.LastWriteTimeUtc))
            .ToArray();
    }

    public async Task<LogTailResult?> LogTail(
        string? file,
        int lines,
        CancellationToken ct)
    {
        if (lines is < 1 or > 10_000)
        {
            return null;
        }
        var directory = new DirectoryInfo(AppPaths.Logs);
        if (!directory.Exists)
        {
            return null;
        }
        FileInfo? target;
        if (string.IsNullOrWhiteSpace(file))
        {
            target = directory.GetFiles("*.log")
                .OrderByDescending(f => f.LastWriteTimeUtc)
                .FirstOrDefault();
        }
        else
        {
            var safeName = System.IO.Path.GetFileName(file);
            target = directory.GetFiles(safeName).FirstOrDefault();
        }
        if (target is null)
        {
            return null;
        }
        var allLines = await ReadAllLinesAsync(target.FullName, ct);
        var tail = allLines.Count > lines
            ? allLines.GetRange(allLines.Count - lines, lines)
            : allLines;
        return new LogTailResult(target.Name, tail, allLines.Count);
    }

    private static async Task<List<string>> ReadAllLinesAsync(string path, CancellationToken ct)
    {
        var results = new List<string>();
        await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
        using var reader = new StreamReader(stream);
        string? line;
        while ((line = await reader.ReadLineAsync(ct)) is not null)
        {
            results.Add(line);
        }
        return results;
    }
}
