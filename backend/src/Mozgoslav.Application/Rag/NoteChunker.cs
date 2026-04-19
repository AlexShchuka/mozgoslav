namespace Mozgoslav.Application.Rag;

/// <summary>
/// ADR-005 D4 — splits a markdown note into chunks suitable for embedding.
/// The strategy is paragraph-based with a soft character cap: paragraphs
/// shorter than <see cref="MaxChars"/> are emitted as-is; longer ones are
/// sliced at the nearest sentence-like boundary.
/// <para>
/// Kept intentionally deterministic and side-effect-free so it's cheap to
/// unit-test over golden corpora.
/// </para>
/// </summary>
public static class NoteChunker
{
    public const int MaxChars = 800;
    private static readonly string[] ParagraphSeparators = ["\r\n\r\n", "\n\n"];
    private static readonly char[] SentenceBreaks = ['.', '!', '?', '\n'];

    public static IReadOnlyList<string> Chunk(string markdown)
    {
        if (string.IsNullOrWhiteSpace(markdown))
        {
            return [];
        }

        var paragraphs = markdown.Split(ParagraphSeparators, StringSplitOptions.RemoveEmptyEntries);
        var chunks = new List<string>();
        foreach (var raw in paragraphs)
        {
            var paragraph = raw.Trim();
            if (paragraph.Length == 0)
            {
                continue;
            }
            if (paragraph.Length <= MaxChars)
            {
                chunks.Add(paragraph);
                continue;
            }
            chunks.AddRange(SplitLong(paragraph));
        }
        return chunks;
    }

    private static IEnumerable<string> SplitLong(string paragraph)
    {
        var start = 0;
        while (start < paragraph.Length)
        {
            var end = Math.Min(start + MaxChars, paragraph.Length);
            if (end < paragraph.Length)
            {
                var breakAt = paragraph.LastIndexOfAny(SentenceBreaks, end - 1, end - start);
                if (breakAt > start)
                {
                    end = breakAt + 1;
                }
            }
            var slice = paragraph[start..end].Trim();
            if (slice.Length > 0)
            {
                yield return slice;
            }
            start = end;
        }
    }
}
