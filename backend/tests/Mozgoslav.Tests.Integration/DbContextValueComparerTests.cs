using FluentAssertions;

using Microsoft.EntityFrameworkCore;

using Mozgoslav.Domain.Entities;

namespace Mozgoslav.Tests.Integration;

/// <summary>
/// ADR-007 BC-051 / bug 7 — in-place list mutations on mapped collection
/// properties must be picked up by the change tracker. Without a
/// <see cref="Microsoft.EntityFrameworkCore.ChangeTracking.ValueComparer{T}"/>,
/// EF only notices a new reference, not a sequence edit — so an element
/// appended to <c>KeyPoints</c> never persists.
/// </summary>
[TestClass]
public sealed class DbContextValueComparerTests
{
    [TestMethod]
    public async Task ProcessedNote_KeyPointsMutation_IsPersisted()
    {
        await using var db = new TestDatabase();

        var note = new ProcessedNote
        {
            Id = Guid.NewGuid(),
            TranscriptId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Summary = "s",
            KeyPoints = ["initial-1", "initial-2"],
            Topic = "t",
        };

        await using (var ctx = db.CreateContext())
        {
            ctx.ProcessedNotes.Add(note);
            await ctx.SaveChangesAsync(TestContext.CancellationToken);
        }

        await using (var ctx = db.CreateContext())
        {
            var loaded = await ctx.ProcessedNotes.FirstAsync(n => n.Id == note.Id, TestContext.CancellationToken);
            loaded.KeyPoints.Add("added-3");
            await ctx.SaveChangesAsync(TestContext.CancellationToken);
        }

        await using (var ctx = db.CreateContext())
        {
            var reloaded = await ctx.ProcessedNotes.FirstAsync(n => n.Id == note.Id, TestContext.CancellationToken);
            reloaded.KeyPoints.Should().Equal("initial-1", "initial-2", "added-3");
        }
    }

    [TestMethod]
    public async Task ProcessedNote_TagsMutation_IsPersisted()
    {
        await using var db = new TestDatabase();

        var note = new ProcessedNote
        {
            Id = Guid.NewGuid(),
            TranscriptId = Guid.NewGuid(),
            ProfileId = Guid.NewGuid(),
            Summary = "s",
            Tags = ["one"],
            Topic = "t",
        };

        await using (var ctx = db.CreateContext())
        {
            ctx.ProcessedNotes.Add(note);
            await ctx.SaveChangesAsync(TestContext.CancellationToken);
        }

        await using (var ctx = db.CreateContext())
        {
            var loaded = await ctx.ProcessedNotes.FirstAsync(n => n.Id == note.Id, TestContext.CancellationToken);
            loaded.Tags.Remove("one");
            loaded.Tags.Add("two");
            loaded.Tags.Add("three");
            await ctx.SaveChangesAsync(TestContext.CancellationToken);
        }

        await using (var ctx = db.CreateContext())
        {
            var reloaded = await ctx.ProcessedNotes.FirstAsync(n => n.Id == note.Id, TestContext.CancellationToken);
            reloaded.Tags.Should().BeEquivalentTo("two", "three");
        }
    }

    public TestContext TestContext { get; set; }
}
