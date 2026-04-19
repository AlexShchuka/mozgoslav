using System.Linq;

using FluentAssertions;

using Mozgoslav.Application.Rag;

namespace Mozgoslav.Tests.Rag;

/// <summary>
/// ADR-005 D4 — chunker splits notes at paragraph boundaries and falls back
/// to sentence-aware slicing when a paragraph is longer than the cap.
///
/// Test list:
///  - Chunk_EmptyOrWhitespace_ReturnsEmpty
///  - Chunk_ParagraphsSplit_AtDoubleNewline
///  - Chunk_LongParagraph_SplitAtSentenceBoundary
///  - Chunk_TrimsAndDropsBlankParagraphs
/// </summary>
[TestClass]
public sealed class NoteChunkerTests
{
    [TestMethod]
    [DataRow("")]
    [DataRow("   ")]
    [DataRow("\n\n\n")]
    public void Chunk_EmptyOrWhitespace_ReturnsEmpty(string input)
    {
        NoteChunker.Chunk(input).Should().BeEmpty();
    }

    [TestMethod]
    public void Chunk_ParagraphsSplit_AtDoubleNewline()
    {
        const string note = """
            Идея проекта Mozgoslav — локальный second-brain.

            Сегодня обсудили интеграцию с Obsidian и Syncthing.

            Вывод: начинаем с MVP.
            """;

        var chunks = NoteChunker.Chunk(note);

        chunks.Should().HaveCount(3);
        chunks[0].Should().Contain("second-brain");
        chunks[1].Should().Contain("Syncthing");
        chunks[2].Should().Contain("MVP");
    }

    [TestMethod]
    public void Chunk_LongParagraph_SplitAtSentenceBoundary()
    {
        var sentences = Enumerable.Range(0, 20)
            .Select(i => $"Предложение номер {i} с какими-то словами про встречи и решения.");
        var longParagraph = string.Join(" ", sentences);

        var chunks = NoteChunker.Chunk(longParagraph);

        chunks.Should().HaveCountGreaterThan(1);
        chunks.Should().AllSatisfy(c => c.Length.Should().BeLessThanOrEqualTo(NoteChunker.MaxChars + 1));
        string.Concat(chunks).Should().Contain("Предложение номер 19");
    }

    [TestMethod]
    public void Chunk_TrimsAndDropsBlankParagraphs()
    {
        const string note = "   \n\nПервый абзац.   \n\n\n\n  \n\nВторой абзац.\n\n";

        var chunks = NoteChunker.Chunk(note);

        chunks.Should().BeEquivalentTo("Первый абзац.", "Второй абзац.");
    }
}
