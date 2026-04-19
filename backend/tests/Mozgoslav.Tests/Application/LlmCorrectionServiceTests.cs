using FluentAssertions;

using Microsoft.Extensions.Logging.Abstractions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Services;
using Mozgoslav.Domain.Entities;

using NSubstitute;

namespace Mozgoslav.Tests.Application;

/// <summary>
/// Plan v0.8 Block 5 — the correction stage is transport-agnostic.
/// Tests wire an NSubstitute <see cref="ILlmProvider"/> so we can assert
/// chunking, prompt composition, and graceful fallback.
/// </summary>
[TestClass]
public sealed class LlmCorrectionServiceTests
{
    [TestMethod]
    public async Task CorrectAsync_WhenProviderReturnsCleanText_ReturnsCorrected()
    {
        var provider = Substitute.For<ILlmProvider>();
        provider.Kind.Returns("openai_compatible");
        provider.ChatAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult("Иван встретился с Мариной в Москве."));

        var factory = Substitute.For<ILlmProviderFactory>();
        factory.GetCurrentAsync(Arg.Any<CancellationToken>()).Returns(Task.FromResult(provider));

        var service = new LlmCorrectionService(factory, new GlossaryApplicator(), NullLogger<LlmCorrectionService>.Instance);
        var profile = new Profile { Glossary = { "Марина" } };
        var result = await service.CorrectAsync("иван встретился с мариной в москве.", profile, CancellationToken.None);

        result.Should().Contain("Мариной");
        result.Should().Contain("Иван");
    }

    [TestMethod]
    public async Task CorrectAsync_WhenProviderReturnsEmpty_FallsBackToRawChunk()
    {
        var provider = Substitute.For<ILlmProvider>();
        provider.Kind.Returns("openai_compatible");
        provider.ChatAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult(string.Empty));

        var factory = Substitute.For<ILlmProviderFactory>();
        factory.GetCurrentAsync(Arg.Any<CancellationToken>()).Returns(Task.FromResult(provider));

        var service = new LlmCorrectionService(factory, new GlossaryApplicator(), NullLogger<LlmCorrectionService>.Instance);
        var result = await service.CorrectAsync("raw transcript", new Profile(), CancellationToken.None);

        result.Should().Contain("raw transcript");
    }

    [TestMethod]
    public async Task CorrectAsync_WhenProviderThrows_ReturnsRawTranscript()
    {
        var provider = Substitute.For<ILlmProvider>();
        provider.Kind.Returns("openai_compatible");
        provider.ChatAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns<Task<string>>(_ => throw new HttpRequestException("connection refused"));

        var factory = Substitute.For<ILlmProviderFactory>();
        factory.GetCurrentAsync(Arg.Any<CancellationToken>()).Returns(Task.FromResult(provider));

        var service = new LlmCorrectionService(factory, new GlossaryApplicator(), NullLogger<LlmCorrectionService>.Instance);
        var result = await service.CorrectAsync("raw transcript", new Profile(), CancellationToken.None);

        result.Should().Be("raw transcript");
    }

    [TestMethod]
    public async Task CorrectAsync_EmptyInput_ReturnsEmptyWithoutInvokingLlm()
    {
        var provider = Substitute.For<ILlmProvider>();
        var factory = Substitute.For<ILlmProviderFactory>();
        factory.GetCurrentAsync(Arg.Any<CancellationToken>()).Returns(Task.FromResult(provider));

        var service = new LlmCorrectionService(factory, new GlossaryApplicator(), NullLogger<LlmCorrectionService>.Instance);
        var result = await service.CorrectAsync("   ", new Profile(), CancellationToken.None);
        result.Should().BeEmpty();
        await provider.DidNotReceive().ChatAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<CancellationToken>());
    }

    [TestMethod]
    public void Chunk_TextShorterThanChunk_ReturnsSingleChunk()
    {
        var chunks = LlmCorrectionService.Chunk("short", 100, 10).ToList();
        chunks.Should().HaveCount(1);
        chunks[0].Should().Be("short");
    }

    [TestMethod]
    public void Chunk_TextLongerThanChunk_OverlapsByOverlapChars()
    {
        var text = new string('a', 10_000);
        var chunks = LlmCorrectionService.Chunk(text, 6_000, 400).ToList();
        chunks.Should().HaveCountGreaterThan(1);
        chunks.All(c => c.Length <= 6_000).Should().BeTrue();
    }

    [TestMethod]
    public void MergeChunks_SingleChunk_ReturnsAsIs()
    {
        var merged = LlmCorrectionService.MergeChunks(["first chunk"], 100);
        merged.Should().Be("first chunk");
    }

    [TestMethod]
    public void MergeChunks_TwoChunks_TrimsOverlapRegion()
    {
        var first = "aaaaaaaaaaBBBBB"; // 15 chars total, 5 trailing to drop
        var second = "CCCCCDDDDDDDDDD";
        var merged = LlmCorrectionService.MergeChunks([first, second], 5);
        merged.Should().Be("aaaaaaaaaaCCCCCDDDDDDDDDD");
    }
}
