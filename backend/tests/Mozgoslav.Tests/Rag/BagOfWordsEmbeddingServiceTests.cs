using FluentAssertions;
using Mozgoslav.Infrastructure.Rag;

namespace Mozgoslav.Tests.Rag;

/// <summary>
/// ADR-005 D3 — baseline embedding service. Properties we rely on:
///  - vector dimension matches the configured size
///  - identical text → identical vector (deterministic)
///  - similar text produces similar vectors (higher cosine than unrelated)
///  - empty/whitespace text → zero vector (never throws)
///  - unicode / case is handled
/// </summary>
[TestClass]
public sealed class BagOfWordsEmbeddingServiceTests
{
    [TestMethod]
    public async Task Embed_OutputsConfiguredDimensionAndIsDeterministic()
    {
        var svc = new BagOfWordsEmbeddingService(dimensions: 128);

        var v1 = await svc.EmbedAsync("встреча по проекту Mozgoslav", CancellationToken.None);
        var v2 = await svc.EmbedAsync("встреча по проекту Mozgoslav", CancellationToken.None);

        v1.Length.Should().Be(128);
        v2.Should().Equal(v1);
    }

    [TestMethod]
    public async Task Embed_SimilarTextHasHigherCosine_ThanUnrelatedText()
    {
        var svc = new BagOfWordsEmbeddingService();

        var query = await svc.EmbedAsync("Obsidian vault synchronization mobile", CancellationToken.None);
        var relevant = await svc.EmbedAsync("настройка Obsidian vault через Syncthing на mobile", CancellationToken.None);
        var unrelated = await svc.EmbedAsync("вечерняя пробежка в парке", CancellationToken.None);

        Cosine(query, relevant).Should().BeGreaterThan(Cosine(query, unrelated));
    }

    [TestMethod]
    public async Task Embed_EmptyInput_ReturnsZeroVector()
    {
        var svc = new BagOfWordsEmbeddingService(dimensions: 64);

        var v = await svc.EmbedAsync("   ", CancellationToken.None);

        v.Length.Should().Be(64);
        v.Should().AllSatisfy(c => c.Should().Be(0f));
    }

    [TestMethod]
    public async Task Embed_IsCaseInsensitive()
    {
        var svc = new BagOfWordsEmbeddingService();

        var lower = await svc.EmbedAsync("mozgoslav rocks", CancellationToken.None);
        var upper = await svc.EmbedAsync("MOZGOSLAV ROCKS", CancellationToken.None);

        upper.Should().Equal(lower);
    }

    [TestMethod]
    public void Constructor_NonPositiveDimensions_Throws()
    {
        var act = () => new BagOfWordsEmbeddingService(dimensions: 0);
        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    private static double Cosine(float[] a, float[] b)
    {
        double dot = 0, na = 0, nb = 0;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        return na == 0 || nb == 0 ? 0 : dot / (Math.Sqrt(na) * Math.Sqrt(nb));
    }
}
