using Mozgoslav.Application.Llm;

namespace Mozgoslav.Infrastructure.Services;

public sealed class InMemoryLlmCapabilitiesCache : ILlmCapabilitiesCache
{
    private volatile LlmCapabilities? _current;

    public LlmCapabilities? TryGetCurrent() => _current;

    public void SetCurrent(LlmCapabilities capabilities)
    {
        _current = capabilities;
    }
}
