using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using FluentAssertions;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Domain.Entities;
using Mozgoslav.Infrastructure.Mcp.Tools;

using NSubstitute;

namespace Mozgoslav.Tests.Infrastructure.Mcp.Tools;

[TestClass]
public sealed class NotesMcpToolsTests
{
    private sealed class Fixture
    {
        public IProcessedNoteRepository Notes { get; } = Substitute.For<IProcessedNoteRepository>();

        public NotesMcpTools BuildSut() => new(Notes);
    }

    [TestMethod]
    public async Task GetAsync_InvalidGuid_ReturnsNull()
    {
        var fixture = new Fixture();
        var sut = fixture.BuildSut();

        var result = await sut.GetAsync("not-a-guid", CancellationToken.None);

        result.Should().BeNull();
        await fixture.Notes.DidNotReceiveWithAnyArgs().GetByIdAsync(default, default);
    }

    [TestMethod]
    public async Task GetAsync_ValidGuid_NoteNotFound_ReturnsNull()
    {
        var fixture = new Fixture();
        var id = Guid.NewGuid();
        fixture.Notes.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns((ProcessedNote?)null);
        var sut = fixture.BuildSut();

        var result = await sut.GetAsync(id.ToString(), CancellationToken.None);

        result.Should().BeNull();
    }

    [TestMethod]
    public async Task GetAsync_ValidGuid_NoteFound_ReturnsMappedDto()
    {
        var fixture = new Fixture();
        var id = Guid.NewGuid();
        var note = new ProcessedNote { Id = id, MarkdownContent = "hello world", CreatedAt = DateTime.UtcNow };
        fixture.Notes.GetByIdAsync(id, Arg.Any<CancellationToken>()).Returns(note);
        var sut = fixture.BuildSut();

        var result = await sut.GetAsync(id.ToString(), CancellationToken.None);

        result.Should().NotBeNull();
        result!.Id.Should().Be(id.ToString());
        result.Content.Should().Be("hello world");
    }

    [TestMethod]
    public async Task ListAsync_NoDates_ReturnsAllNotes()
    {
        var fixture = new Fixture();
        var notes = new List<ProcessedNote>
        {
            new() { Id = Guid.NewGuid(), MarkdownContent = "a", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), MarkdownContent = "b", CreatedAt = DateTime.UtcNow.AddMinutes(-1) }
        };
        fixture.Notes.GetAllAsync(Arg.Any<CancellationToken>()).Returns(notes);
        var sut = fixture.BuildSut();

        var result = await sut.ListAsync(null, null, CancellationToken.None);

        result.Should().HaveCount(2);
    }

    [TestMethod]
    public async Task CreateAsync_ValidText_AddsNote()
    {
        var fixture = new Fixture();
        var saved = new ProcessedNote { Id = Guid.NewGuid(), MarkdownContent = "new note" };
        fixture.Notes.AddAsync(Arg.Any<ProcessedNote>(), Arg.Any<CancellationToken>()).Returns(saved);
        var sut = fixture.BuildSut();

        var result = await sut.CreateAsync("new note", CancellationToken.None);

        result.Content.Should().Be("new note");
        await fixture.Notes.Received(1).AddAsync(Arg.Is<ProcessedNote>(n => n.MarkdownContent == "new note"), Arg.Any<CancellationToken>());
    }
}
