using System;
using System.Collections.Generic;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Entities;

public sealed class Profile
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string SystemPrompt { get; set; } = string.Empty;

    /// <summary>
    /// Optional per-profile override of the Whisper initial prompt. When empty,
    /// the default global prompt is used.
    /// </summary>
    public string TranscriptionPromptOverride { get; set; } = string.Empty;

    public string OutputTemplate { get; set; } = string.Empty;
    public CleanupLevel CleanupLevel { get; set; } = CleanupLevel.Light;
    public string ExportFolder { get; set; } = "_inbox";
    public List<string> AutoTags { get; set; } = [];
    public bool IsDefault { get; set; }
    public bool IsBuiltIn { get; set; }

    /// <summary>
    /// Per-profile domain terms (company / product names, proper nouns,
    /// technical terminology). When non-empty the pipeline:
    /// <list type="bullet">
    ///   <item>joins the terms into the Whisper <c>initial_prompt</c>,</item>
    ///   <item>forwards them in the LLM summarisation system prompt so
    ///         the model preserves spelling verbatim.</item>
    /// </list>
    /// Plan v0.8 Block 5 (<c>.archive/docs/v0.8-release/05-glossary-and-llm-correction.md</c>).
    /// </summary>
    public List<string> Glossary { get; set; } = [];

    /// <summary>
    /// When <c>true</c>, a dedicated <c>LlmCorrectionService</c> pass runs
    /// between regex filler cleanup and summarisation to fix homophones,
    /// proper-noun spellings and punctuation. Defaults to <c>false</c> per
    /// ADR-009 §2 line 3 (disabled-by-default feature flag).
    /// </summary>
    public bool LlmCorrectionEnabled { get; set; }
}
