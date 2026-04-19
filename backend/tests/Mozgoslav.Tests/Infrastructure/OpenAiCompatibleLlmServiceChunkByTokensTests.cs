using System.Collections.Generic;
using System.Linq;
using System.Reflection;

using FluentAssertions;

using Microsoft.ML.Tokenizers;

using Mozgoslav.Infrastructure.Services;

namespace Mozgoslav.Tests.Infrastructure;

/// <summary>
/// ADR-011 step 4 — pin the behaviours <c>OpenAiCompatibleLlmService.ChunkByTokens</c>
/// relies on: the tokenizer is cl100k_base (shared with GPT-4), slices never
/// exceed the configured budget, every source character lands in exactly one
/// slice, and short inputs pass through unchanged.
/// </summary>
[TestClass]
public sealed class OpenAiCompatibleLlmServiceChunkByTokensTests
{
    private static readonly Tokenizer SharedTokenizer = TiktokenTokenizer.CreateForModel("gpt-4");

    [TestMethod]
    public void ChunkByTokens_ShortInput_ReturnsOneSliceMatchingSource()
    {
        const string Input = "Короткая реплика.";

        var chunks = InvokeChunkByTokens(Input, 6_000);

        chunks.Should().ContainSingle().Which.Should().Be(Input);
    }

    [TestMethod]
    public void ChunkByTokens_EmptyInput_ReturnsEmptySequence()
    {
        var chunks = InvokeChunkByTokens(string.Empty, 6_000);

        chunks.Should().BeEmpty();
    }

    [TestMethod]
    public void ChunkByTokens_OverBudget_SplitsIntoMultipleSlices()
    {
        var input = string.Concat(Enumerable.Repeat("Собеседник сказал что-то важное и мы это зафиксировали. ", 200));
        const int Budget = 50;

        var chunks = InvokeChunkByTokens(input, Budget).ToList();

        chunks.Count.Should().BeGreaterThan(1);
        foreach (var chunk in chunks)
        {
            var tokenCount = SharedTokenizer.CountTokens(chunk);
            tokenCount.Should().BeLessThanOrEqualTo(Budget);
        }
    }

    [TestMethod]
    public void ChunkByTokens_Concatenated_EqualsSourceWithoutLoss()
    {
        var input = string.Concat(Enumerable.Repeat("Lorem ipsum dolor sit amet. ", 100));

        var chunks = InvokeChunkByTokens(input, 20).ToList();
        var rejoined = string.Concat(chunks);

        rejoined.Should().Be(input);
    }

    private static IEnumerable<string> InvokeChunkByTokens(string text, int maxTokens)
    {
        var method = typeof(OpenAiCompatibleLlmService).GetMethod(
            "ChunkByTokens",
            BindingFlags.NonPublic | BindingFlags.Static);
        method.Should().NotBeNull();
        return (IEnumerable<string>)method!.Invoke(null, [text, maxTokens])!;
    }
}
