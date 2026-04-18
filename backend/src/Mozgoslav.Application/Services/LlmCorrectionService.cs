using System.Text;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Application.Services;

/// <summary>
/// Plan v0.8 Block 5 §2.2 — a dedicated LLM pass that fixes transcription
/// errors (homophones, proper-noun spellings, punctuation) without
/// paraphrasing. Runs between regex filler cleanup and summarisation when
/// the active <see cref="Profile.LlmCorrectionEnabled"/> flag is set.
/// <para>
/// Resilience: any LLM error (unreachable endpoint, empty response,
/// exception) surfaces as a WARN log and returns the raw transcript
/// unchanged — the pipeline never breaks because of a transient LLM issue.
/// </para>
/// </summary>
public sealed class LlmCorrectionService
{
    private const int ChunkChars = 6_000;
    private const int OverlapChars = 400;

    private readonly ILlmProviderFactory _providerFactory;
    private readonly GlossaryApplicator _glossary;
    private readonly ILogger<LlmCorrectionService> _logger;

    public LlmCorrectionService(
        ILlmProviderFactory providerFactory,
        GlossaryApplicator glossary,
        ILogger<LlmCorrectionService> logger)
    {
        _providerFactory = providerFactory;
        _glossary = glossary;
        _logger = logger;
    }

    public async Task<string> CorrectAsync(string rawText, Profile profile, CancellationToken ct)
    {
        ArgumentNullException.ThrowIfNull(profile);
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return string.Empty;
        }

        var systemPrompt = BuildSystemPrompt(profile);
        try
        {
            var provider = await _providerFactory.GetCurrentAsync(ct);
            var chunks = Chunk(rawText, ChunkChars, OverlapChars).ToList();
            var corrected = new List<string>(chunks.Count);
            foreach (var chunk in chunks)
            {
                var response = await provider.ChatAsync(systemPrompt, chunk, ct);
                if (string.IsNullOrWhiteSpace(response))
                {
                    _logger.LogWarning("LLM correction returned empty response; falling back to raw chunk");
                    corrected.Add(chunk);
                }
                else
                {
                    corrected.Add(response.Trim());
                }
            }
            return MergeChunks(corrected, OverlapChars);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "LLM correction pass failed — returning raw transcript");
            return rawText;
        }
    }

    private string BuildSystemPrompt(Profile profile)
    {
        var glossarySuffix = _glossary.TryBuildLlmSystemPromptSuffix(profile);
        var core = "You are a transcription editor. Fix only evident transcription errors: " +
                   "homophones, incorrect proper-noun spellings, missing punctuation, " +
                   "word-boundary slips. Do not paraphrase, do not translate, do not " +
                   "shorten. Output only the corrected text.";
        return string.IsNullOrWhiteSpace(glossarySuffix) ? core : core + " " + glossarySuffix;
    }

    // Overlapping windows so punctuation/capitalisation at the boundary does
    // not get truncated by a clean chunk break. Default overlap is small
    // (400 chars ≈ 100 tokens) which is enough for Russian sentence spans
    // without ballooning the LLM cost.
    public static IEnumerable<string> Chunk(string text, int chunkChars, int overlapChars)
    {
        if (text.Length <= chunkChars)
        {
            yield return text;
            yield break;
        }
        if (overlapChars < 0 || overlapChars >= chunkChars)
        {
            throw new ArgumentOutOfRangeException(nameof(overlapChars), "overlap must be in [0, chunkChars)");
        }
        var step = chunkChars - overlapChars;
        for (var i = 0; i < text.Length; i += step)
        {
            var length = Math.Min(chunkChars, text.Length - i);
            yield return text.Substring(i, length);
            if (i + length >= text.Length)
            {
                yield break;
            }
        }
    }

    public static string MergeChunks(IReadOnlyList<string> corrected, int overlapChars)
    {
        if (corrected.Count == 0)
        {
            return string.Empty;
        }
        if (corrected.Count == 1)
        {
            return corrected[0];
        }
        // Simple concatenation with an approximate overlap-trim — we drop the
        // last `overlapChars` of each preceding chunk to avoid duplicated
        // boundary tokens. This is heuristic; the summarisation step
        // tolerates small overlaps gracefully.
        var first = corrected[0];
        var builder = new StringBuilder(first, first.Length + corrected.Count * 128);
        for (var i = 1; i < corrected.Count; i++)
        {
            // Trim the overlap from the end of the running text so the next
            // chunk starts clean. When the previous chunk was shorter than
            // the overlap window we just append without trimming.
            if (builder.Length >= overlapChars)
            {
                builder.Length -= overlapChars;
            }
            builder.Append(corrected[i]);
        }
        return builder.ToString().Trim();
    }
}
