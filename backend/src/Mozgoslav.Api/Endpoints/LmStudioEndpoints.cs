using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.Endpoints;

public static class LmStudioEndpoints
{
    /// <summary>
    /// Curated "suggested" model list for ADR-006 D-11. Each row ships a
    /// deep-link into LM Studio so the user can open the download screen for
    /// that exact model with one click. Mozgoslav does not host or mirror
    /// weights — we just point users at LM Studio's own catalog.
    /// </summary>
    private static readonly SuggestedModel[] Suggested =
    [
        new("qwen/qwen3-7b-instruct", "Qwen 3 7B Instruct",
            "Compact general-purpose chat / summarization. ~4.5 GB.",
            "lmstudio://models/qwen/qwen3-7b-instruct", "llm"),
        new("qwen/qwen3-14b-instruct", "Qwen 3 14B Instruct",
            "Stronger summarization + reasoning. ~8.5 GB.",
            "lmstudio://models/qwen/qwen3-14b-instruct", "llm"),
        new("meta-llama/Llama-3.3-8B-Instruct", "Llama 3.3 8B Instruct",
            "Meta's latest small-footprint chat model. ~5 GB.",
            "lmstudio://models/meta-llama/Llama-3.3-8B-Instruct", "llm"),
        new("google/gemma-3-9b-it", "Gemma 3 9B",
            "Google's open multilingual model. ~5.5 GB.",
            "lmstudio://models/google/gemma-3-9b-it", "llm"),
        new("openai/whisper-large-v3-turbo", "Whisper large-v3-turbo",
            "Fastest Whisper for transcription. ~1.5 GB.",
            "lmstudio://models/openai/whisper-large-v3-turbo", "stt"),
    ];

    public sealed record SuggestedModel(
        string Id,
        string Name,
        string Description,
        string DeepLink,
        string Kind);

    public static IEndpointRouteBuilder MapLmStudioEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/lmstudio/models", async (
            ILmStudioClient client,
            CancellationToken ct) =>
        {
            // ADR-006 D-11: { installed, reachable, suggested } — `reachable`
            // lets the UI swap between "install LM Studio" empty-state copy
            // and the real "no models loaded yet" state, while `suggested`
            // drives the curated deep-link catalog.
            var result = await client.ListModelsAsync(ct);
            return Results.Ok(new
            {
                installed = result.Installed,
                reachable = result.Reachable,
                suggested = Suggested,
            });
        });

        return endpoints;
    }
}
