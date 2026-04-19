using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface IMarkdownExporter
{
    /// <summary>
    /// Writes a markdown file for the supplied note and returns the absolute path to the written file.
    /// </summary>
    Task<string> ExportAsync(ProcessedNote note, Profile profile, string vaultPath, CancellationToken ct);
}
