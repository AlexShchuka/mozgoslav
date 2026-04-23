using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface IMarkdownExporter
{
    Task<string> ExportAsync(ProcessedNote note, Profile profile, string vaultPath, CancellationToken ct);
}
