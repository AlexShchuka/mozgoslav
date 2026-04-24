using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface ILlmService
{
    Task<LlmProcessingResult> ProcessAsync(
        string transcript,
        string systemPrompt,
        CancellationToken ct);

    Task<bool> IsAvailableAsync(CancellationToken ct);

    Task<IReadOnlyList<string>> ListAvailableModelsAsync(CancellationToken ct);
}
