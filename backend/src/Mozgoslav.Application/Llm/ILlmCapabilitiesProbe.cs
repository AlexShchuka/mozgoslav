using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Llm;

public interface ILlmCapabilitiesProbe
{
    Task<LlmCapabilities> ProbeAsync(string endpoint, string model, string apiKey, CancellationToken ct);
}
