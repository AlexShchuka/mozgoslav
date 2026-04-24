using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface ILlmProviderFactory
{
    Task<ILlmProvider> GetCurrentAsync(CancellationToken ct);
}
