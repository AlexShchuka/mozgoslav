using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface ILlmProvider
{
    string Kind { get; }

    Task<string> ChatAsync(string systemPrompt, string userPrompt, CancellationToken ct);

    Task<string> ChatWithModelAsync(string systemPrompt, string userPrompt, string model, CancellationToken ct)
        => ChatAsync(systemPrompt, userPrompt, ct);
}
