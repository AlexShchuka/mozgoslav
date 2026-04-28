using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Prompts;

public interface IPromptBuilder
{
    Task<string> BuildAsync(
        string promptTemplate,
        IReadOnlyDictionary<string, string> context,
        CancellationToken ct);
}
