using FluentAssertions;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;
using Mozgoslav.Infrastructure.Repositories;
using Mozgoslav.Infrastructure.Seed;

namespace Mozgoslav.Tests.Integration;

[TestClass]
public sealed class EfProfileRepositoryTests
{
    [TestMethod]
    public async Task AddAsync_ThenGetById_RoundTripsPreservingTags()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProfileRepository(ctx);
        var profile = new Profile
        {
            Name = "Test",
            SystemPrompt = "prompt",
            CleanupLevel = CleanupLevel.Aggressive,
            ExportFolder = "_inbox",
            AutoTags = ["tag1", "tag2"],
            IsDefault = true,
        };

        await repo.AddAsync(profile, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var loaded = await new EfProfileRepository(freshCtx).GetByIdAsync(profile.Id, CancellationToken.None);

        loaded.Should().NotBeNull();
        loaded.Name.Should().Be("Test");
        loaded.SystemPrompt.Should().Be("prompt");
        loaded.CleanupLevel.Should().Be(CleanupLevel.Aggressive);
        loaded.AutoTags.Should().BeEquivalentTo("tag1", "tag2");
        loaded.IsDefault.Should().BeTrue();
    }

    [TestMethod]
    public async Task AddAsync_SameIdTwice_IsIdempotent()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProfileRepository(ctx);

        await repo.AddAsync(BuiltInProfiles.Work, CancellationToken.None);
        await repo.AddAsync(BuiltInProfiles.Work, CancellationToken.None);

        var all = await repo.GetAllAsync(CancellationToken.None);
        all.Should().HaveCount(1);
    }

    [TestMethod]
    public async Task TryGetDefaultAsync_WhenDefaultSeeded_ReturnsIt()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProfileRepository(ctx);

        foreach (var seed in BuiltInProfiles.All)
        {
            await repo.AddAsync(seed, CancellationToken.None);
        }

        var defaultProfile = await repo.TryGetDefaultAsync(CancellationToken.None);

        defaultProfile.Should().NotBeNull();
        defaultProfile.IsDefault.Should().BeTrue();
        defaultProfile.Name.Should().Be("Рабочий");
    }

    [TestMethod]
    public async Task UpdateAsync_ChangesStoredName()
    {
        await using var db = new TestDatabase();
        await using var ctx = db.CreateContext();
        var repo = new EfProfileRepository(ctx);
        var profile = BuiltInProfiles.Personal;
        await repo.AddAsync(profile, CancellationToken.None);

        profile.Name = "Обновлённый";
        await repo.UpdateAsync(profile, CancellationToken.None);

        await using var freshCtx = db.CreateContext();
        var loaded = await new EfProfileRepository(freshCtx).GetByIdAsync(profile.Id, CancellationToken.None);
        loaded!.Name.Should().Be("Обновлённый");
    }
}
