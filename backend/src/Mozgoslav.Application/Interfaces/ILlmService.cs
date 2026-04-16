namespace Mozgoslav.Application.Interfaces;

public interface ILlmService
{
    Task<LlmProcessingResult> ProcessAsync(
        string transcript,
        string systemPrompt,
        CancellationToken ct);

    Task<bool> IsAvailableAsync(CancellationToken ct);
}
