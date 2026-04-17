# LLM chunking review — TODO-7

Scope: revisit `OpenAiCompatibleLlmService.Chunk/Merge` against meetily upstream
hints (`docs/meetily-inheritance.md`, `transcript_processor.py`) to decide
whether the current strategy needs a correctness fix before the multi-provider
landing.

## What we do today

```csharp
// OpenAiCompatibleLlmService.Chunk
private static IEnumerable<string> Chunk(string text, int maxChars)
{
    if (text.Length <= maxChars) { yield return text; yield break; }
    for (var i = 0; i < text.Length; i += maxChars)
        yield return text.Substring(i, Math.Min(maxChars, text.Length - i));
}
```

- **Upper bound** — `maxChars = 24_000` chars per LLM call.
- **Split strategy** — fixed-length windows, no overlap, no sentence / paragraph
  awareness.
- **Merge** — dedupe-concat on list fields; summaries joined with `\n\n`;
  `Topic` / `ConversationType` keep the first non-empty / non-`Other` value.

## Evidence pulled

1. `docs/meetily-inheritance.md` — only a forward-looking note: «при апгрейде
   `OpenAiCompatibleLlmService.Chunk/Merge` свериться с `transcript_processor.py`
   из meetily». No code to reference in `.archive/`.
2. No `transcript_processor.py` or meetily fork source is vendored into this
   repo — the canonical file lives on the upstream meetily repo which is out
   of scope for this sandboxed run.
3. Current scope constraint (ADR-007 §2.3) treats meetily as a historical
   reference, not a source of truth.

That leaves the review grounded in the code itself plus the semantics the
pipeline downstream expects.

## Findings

### F1 — Char-based budget, not token-based

`maxChars = 24_000` is a proxy for an LLM context budget. At rough
heuristics of 3-4 chars per token in Russian / English blended text, the
window is ≈ 6-8 k tokens per call. For OpenAI-compatible models with 32 k / 128 k
contexts this is comfortable; for a small local LM Studio model (4 k) it
would overflow. **Not a correctness bug** — `MaxOutputTokenCount = 4096` and
the model's `max_tokens` safety-net keep the server honest — but it is a
silent coupling to model capability.

Decision: **do not change now**. BC-013 guarantees graceful degradation on
413 / timeout; tightening the budget without runtime evidence risks
unnecessary fragmentation and regressed summary quality. Flagged as
«configurable via settings» for a future slice.

### F2 — No sentence / paragraph boundary awareness

The raw `Substring` slice can split a sentence, a JSON brace, or a UTF-16
surrogate pair. The downstream JSON extraction (`ExtractJson`) only looks for
the outermost `{...}` in each response, so a *chunk* split in the middle of a
sentence still returns a complete JSON doc per chunk — the LLM is asked to
summarise each chunk independently, not to resume a split mid-sentence.

Practical consequence: summaries of adjacent chunks may have repeated or
split facts; `Merge.CombineSummaries` concatenates them with `\n\n`. Reading
the concatenation feels rough but is not factually wrong.

Decision: **defer**. Fixing this would require a semantic splitter (paragraph
/ sentence) that is language-aware (RU + EN), which is a non-trivial change
outside TODO-7's «correctness improvement» bar.

### F3 — Potential UTF-16 surrogate split

`text.Substring(i, length)` on a 24000-char boundary can split a surrogate
pair if `text[i-1]` is a high surrogate and `text[i]` is a low surrogate.
In Russian / English prose this is almost never the case (no astral-plane
codepoints), but in emoji-heavy transcripts the `Substring` would produce
an invalid UTF-16 sequence that the OpenAI SDK serialises with the `U+FFFD`
replacement character.

Decision: **defer, document**. The damage is cosmetic (a single `?` in a
summary) and the upstream transcript is Whisper output, which does not emit
emoji. Worth a `TextElementEnumerator`-based splitter in the future.

### F4 — `Merge.CombineSummaries` preserves ordering and newlines

Originally flagged as a suspect («merge loses newlines»). Re-read confirms:

```csharp
return a + "\n\n" + b;
```

A double newline is inserted between every non-empty chunk summary. This is
the behaviour we want. The empty-guard on either side avoids the leading /
trailing `"\n\n"` that would otherwise appear on the first chunk. **No fix
needed.**

### F5 — `Combine<T>.Distinct()` relies on default equality

Items (`ActionItem`) are compared by reference if they are reference types
without custom `Equals`. `ActionItem` is a record (value-equal), so this
works for full duplicates. But the same task phrased two ways survives.

Decision: **document only**. Cross-chunk dedup with fuzzy equality is a
summarisation-quality concern, not a Chunk/Merge correctness bug.

## Verdict

No blocking correctness defect surfaces. The current strategy is:

- Safe for the happy path — complete sentences / paragraphs are fed to the
  LLM most of the time; split-mid-word cases degrade summary polish, not
  factuality.
- Safe for the failure path — per-chunk JSON extraction + `ParseOrRepair`
  absorbs malformed outputs; transport failures surface as empty results
  (BC-013).
- Aware of its own limits — `MaxOutputTokenCount` caps reply length; a
  too-small context model fails fast, not silently.

Follow-up candidates (NOT in scope for TODO-7):

1. Make `maxChars` a setting (`LlmChunkMaxChars`).
2. Replace `Substring` with a paragraph-aware splitter (RU/EN `\n\n`).
3. Replace `Combine.Distinct` with fuzzy equality for `ActionItem` / `string`
   fields to suppress near-duplicates across adjacent chunks.

**Deliverable of TODO-7: this review only.** No code change, no new unit
test needed — existing `OpenAiCompatibleLlmServiceTests` already locks the
current behaviour.
