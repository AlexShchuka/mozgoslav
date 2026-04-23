using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.AspNetCore.Mvc;

using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Api.Controllers;

[ApiController]
[Route("api/logs")]
public sealed class LogsController : ControllerBase
{
    [HttpGet]
    public IActionResult List()
    {
        var directory = new DirectoryInfo(AppPaths.Logs);
        if (!directory.Exists)
        {
            return Ok(Array.Empty<object>());
        }

        var files = directory.GetFiles("*.log")
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .Select(f => new
            {
                fileName = f.Name,
                sizeBytes = f.Length,
                lastModifiedUtc = f.LastWriteTimeUtc
            })
            .ToArray();
        return Ok(files);
    }

    [HttpGet("tail")]
    public async Task<IActionResult> TailAsync(
        [FromQuery] string? file = null,
        [FromQuery] int lines = 400,
        CancellationToken cancellationToken = default)
    {
        if (lines is < 1 or > 10_000)
        {
            return BadRequest(new { error = "lines out of range (1..10000)" });
        }

        var directory = new DirectoryInfo(AppPaths.Logs);
        if (!directory.Exists)
        {
            return NotFound(new { error = "Log directory does not exist" });
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
            var safeName = Path.GetFileName(file);
            target = directory.GetFiles(safeName).FirstOrDefault();
        }

        if (target is null)
        {
            return NotFound(new { error = "Log file not found" });
        }

        var allLines = await ReadAllLinesAsync(target.FullName, cancellationToken);
        var tail = allLines.Count > lines
            ? allLines.GetRange(allLines.Count - lines, lines)
            : allLines;
        return Ok(new
        {
            file = target.Name,
            lines = tail,
            totalLines = allLines.Count
        });
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
