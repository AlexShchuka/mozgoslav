using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Agents.Skills;

public interface IRemindersSkill
{
    Task CreateAsync(IReadOnlyList<ActionItem> items, CancellationToken ct);
}
