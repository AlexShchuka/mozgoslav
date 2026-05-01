using System;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

using Mozgoslav.Application.Prompts;
using Mozgoslav.Infrastructure.Persistence;
using Mozgoslav.Infrastructure.Prompts;

namespace Mozgoslav.Tests.Infrastructure.Prompts;

[TestClass]
public sealed class PromptTemplateRepositoryTests : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly MozgoslavDbContext _db;

    public PromptTemplateRepositoryTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<MozgoslavDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new MozgoslavDbContext(options);
        _db.Database.EnsureCreated();
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    private PromptTemplateRepository BuildSut() => new(_db);

    [TestMethod]
    public async Task AddAsync_PersistsTemplate_CanBeRetrievedById()
    {
        var template = new PromptTemplate(Guid.NewGuid(), "My Template", "Hello {name}", DateTimeOffset.UtcNow);
        var sut = BuildSut();

        var added = await sut.AddAsync(template, CancellationToken.None);
        var retrieved = await sut.GetByIdAsync(added.Id, CancellationToken.None);

        retrieved.Should().NotBeNull();
        retrieved!.Name.Should().Be("My Template");
        retrieved.Body.Should().Be("Hello {name}");
    }

    [TestMethod]
    public async Task GetByIdAsync_UnknownId_ReturnsNull()
    {
        var sut = BuildSut();

        var result = await sut.GetByIdAsync(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeNull();
    }

    [TestMethod]
    public async Task GetAllAsync_ReturnsAllTemplatesOrderedByName()
    {
        var sut = BuildSut();
        await sut.AddAsync(new PromptTemplate(Guid.NewGuid(), "Zzz", "body z", DateTimeOffset.UtcNow), CancellationToken.None);
        await sut.AddAsync(new PromptTemplate(Guid.NewGuid(), "Aaa", "body a", DateTimeOffset.UtcNow), CancellationToken.None);

        var all = await sut.GetAllAsync(CancellationToken.None);

        all.Should().HaveCount(2);
        all[0].Name.Should().Be("Aaa");
        all[1].Name.Should().Be("Zzz");
    }

    [TestMethod]
    public async Task UpdateAsync_ModifiesNameAndBody()
    {
        var sut = BuildSut();
        var id = Guid.NewGuid();
        await sut.AddAsync(new PromptTemplate(id, "Old Name", "Old Body", DateTimeOffset.UtcNow), CancellationToken.None);

        await sut.UpdateAsync(new PromptTemplate(id, "New Name", "New Body", DateTimeOffset.UtcNow), CancellationToken.None);

        var updated = await sut.GetByIdAsync(id, CancellationToken.None);
        updated!.Name.Should().Be("New Name");
        updated.Body.Should().Be("New Body");
    }

    [TestMethod]
    public async Task TryDeleteAsync_ExistingId_RemovesAndReturnsTrue()
    {
        var sut = BuildSut();
        var id = Guid.NewGuid();
        await sut.AddAsync(new PromptTemplate(id, "To Delete", "body", DateTimeOffset.UtcNow), CancellationToken.None);

        var deleted = await sut.TryDeleteAsync(id, CancellationToken.None);
        var after = await sut.GetByIdAsync(id, CancellationToken.None);

        deleted.Should().BeTrue();
        after.Should().BeNull();
    }

    [TestMethod]
    public async Task TryDeleteAsync_UnknownId_ReturnsFalse()
    {
        var sut = BuildSut();

        var result = await sut.TryDeleteAsync(Guid.NewGuid(), CancellationToken.None);

        result.Should().BeFalse();
    }

    [TestMethod]
    public async Task UpdateAsync_UnknownId_DoesNotThrow()
    {
        var sut = BuildSut();

        var act = async () => await sut.UpdateAsync(
            new PromptTemplate(Guid.NewGuid(), "Ghost", "nobody home", DateTimeOffset.UtcNow),
            CancellationToken.None);

        await act.Should().NotThrowAsync();
    }
}
