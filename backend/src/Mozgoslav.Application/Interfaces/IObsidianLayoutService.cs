using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// ADR-007-shared §2.6 BC-025 — materialises PARA-style scaffolding under
/// the vault root (Projects / Areas / Resources / Archive / Inbox /
/// Templates) and moves already-exported notes into the correct bucket
/// according to active <c>VaultExportRule</c>s.
/// Idempotent: calling it twice creates zero new folders on the second run.
/// </summary>
public interface IObsidianLayoutService
{
    Task<ApplyLayoutResult> ApplyParaLayoutAsync(CancellationToken ct);
}

public sealed record ApplyLayoutResult(int CreatedFolders, int MovedNotes);
