using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Interfaces;

public interface ILlmProviderFactory
{
    Task<ILlmProvider> GetCurrentAsync(CancellationToken ct);
    Task<ILlmProvider> GetForProfileAsync(Profile profile, CancellationToken ct);
}
