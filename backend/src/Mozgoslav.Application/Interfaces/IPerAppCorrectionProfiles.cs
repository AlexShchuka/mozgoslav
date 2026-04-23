using System;
using System.Collections.Generic;

namespace Mozgoslav.Application.Interfaces;

public interface IPerAppCorrectionProfiles
{
    PerAppCorrectionProfile Resolve(string? bundleId);
}

public sealed record PerAppCorrectionProfile(
    string BundleId,
    string SystemPromptSuffix,
    IReadOnlyDictionary<string, string> Glossary)
{
    public static readonly PerAppCorrectionProfile Empty = new(
        BundleId: string.Empty,
        SystemPromptSuffix: string.Empty,
        Glossary: new Dictionary<string, string>(StringComparer.Ordinal));

    public bool IsEmpty =>
        string.IsNullOrEmpty(SystemPromptSuffix) && Glossary.Count == 0;
}
