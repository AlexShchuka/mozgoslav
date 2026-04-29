using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.Llm;

namespace Mozgoslav.Application.Interfaces;

public interface IModelCatalogService
{
    Task<IReadOnlyList<LlmModelDescriptor>> GetAvailableAsync(CancellationToken ct);
}
