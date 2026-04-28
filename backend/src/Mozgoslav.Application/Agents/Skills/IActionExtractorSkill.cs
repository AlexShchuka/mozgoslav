using System;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Agents.Skills;

public interface IActionExtractorSkill
{
    Task ExtractAsync(Guid noteId, CancellationToken ct);
}
