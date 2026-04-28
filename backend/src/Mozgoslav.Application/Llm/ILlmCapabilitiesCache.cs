namespace Mozgoslav.Application.Llm;

public interface ILlmCapabilitiesCache
{
    LlmCapabilities? TryGetCurrent();
    void SetCurrent(LlmCapabilities capabilities);
}
