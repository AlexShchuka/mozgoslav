using System;
using System.Linq;

using FluentAssertions;

using Mozgoslav.Api.Models;

namespace Mozgoslav.Tests.Api.Models;

[TestClass]
public sealed class ModelCatalogTests
{
    [TestMethod]
    public void All_ReturnsNonEmptyList()
    {
        ModelCatalog.All.Should().NotBeEmpty();
    }

    [TestMethod]
    public void All_EveryEntry_HasNonEmptyId()
    {
        ModelCatalog.All.Should().AllSatisfy(e =>
            e.Id.Should().NotBeNullOrWhiteSpace());
    }

    [TestMethod]
    public void All_EveryEntry_HasNonEmptyName()
    {
        ModelCatalog.All.Should().AllSatisfy(e =>
            e.Name.Should().NotBeNullOrWhiteSpace());
    }

    [TestMethod]
    public void All_EveryEntry_HasNonEmptyUrl()
    {
        ModelCatalog.All.Should().AllSatisfy(e =>
            e.Url.Should().NotBeNullOrWhiteSpace());
    }

    [TestMethod]
    public void All_EveryEntry_HasPositiveSizeMb()
    {
        ModelCatalog.All.Should().AllSatisfy(e =>
            e.SizeMb.Should().BePositive());
    }

    [TestMethod]
    public void All_NoduplicateIds()
    {
        var ids = ModelCatalog.All.Select(e => e.Id).ToList();
        ids.Distinct(StringComparer.OrdinalIgnoreCase).Should().HaveCount(ids.Count);
    }

    [TestMethod]
    public void All_ContainsSttModels()
    {
        var sttModels = ModelCatalog.All.Where(e => e.Kind == ModelKind.Stt).ToList();
        sttModels.Should().NotBeEmpty();
    }

    [TestMethod]
    public void All_ContainsVadModel()
    {
        var vadModels = ModelCatalog.All.Where(e => e.Kind == ModelKind.Vad).ToList();
        vadModels.Should().NotBeEmpty();
    }

    [TestMethod]
    public void All_ExactlyOneDefaultPerKind()
    {
        var sttDefaults = ModelCatalog.All.Count(e => e.Kind == ModelKind.Stt && e.IsDefault);
        sttDefaults.Should().Be(1);

        var vadDefaults = ModelCatalog.All.Count(e => e.Kind == ModelKind.Vad && e.IsDefault);
        vadDefaults.Should().Be(1);
    }

    [TestMethod]
    public void TryGet_KnownId_ReturnsEntry()
    {
        var entry = ModelCatalog.TryGet("whisper-large-v3-russian-antony66");

        entry.Should().NotBeNull();
        entry.Id.Should().Be("whisper-large-v3-russian-antony66");
    }

    [TestMethod]
    public void TryGet_UnknownId_ReturnsNull()
    {
        var entry = ModelCatalog.TryGet("nonexistent-model-xyz");

        entry.Should().BeNull();
    }

    [TestMethod]
    public void TryGet_LookupIsCaseInsensitive()
    {
        var entry = ModelCatalog.TryGet("WHISPER-LARGE-V3-RUSSIAN-ANTONY66");

        entry.Should().NotBeNull();
    }

    [TestMethod]
    public void TryGet_Alias_ResolvesToCanonicalEntry()
    {
        var aliasResult = ModelCatalog.TryGet("antony66-ggml");
        var directResult = ModelCatalog.TryGet("whisper-large-v3-russian-antony66");

        aliasResult.Should().Be(directResult);
    }

    [TestMethod]
    public void TryGet_EmptyString_ReturnsNull()
    {
        var entry = ModelCatalog.TryGet(string.Empty);

        entry.Should().BeNull();
    }

    [TestMethod]
    public void All_BundledModels_HaveBundleTier()
    {
        var bundled = ModelCatalog.All.Where(e => e.Tier == ModelTier.Bundle).ToList();
        bundled.Should().NotBeEmpty();
    }

    [TestMethod]
    public void All_SttModels_HaveValidKind()
    {
        var stt = ModelCatalog.All.Where(e => e.Kind == ModelKind.Stt);
        stt.Should().AllSatisfy(e => e.Kind.Should().Be(ModelKind.Stt));
    }
}
