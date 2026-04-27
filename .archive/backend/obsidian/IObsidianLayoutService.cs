using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface IObsidianLayoutService
{
    Task<ApplyLayoutResult> ApplyParaLayoutAsync(CancellationToken ct);
}

public sealed record ApplyLayoutResult(int CreatedFolders, int MovedNotes);
