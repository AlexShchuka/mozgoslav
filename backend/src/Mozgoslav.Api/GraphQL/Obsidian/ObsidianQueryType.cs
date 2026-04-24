using System;
using System.IO;
using System.Linq;

using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;

namespace Mozgoslav.Api.GraphQL.Obsidian;

[ExtendObjectType(typeof(QueryType))]
public sealed class ObsidianQueryType
{
    public ObsidianDetectionResult ObsidianDetect()
    {
        var home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        string[] candidates =
        [
            Path.Combine(home, "Documents", "Obsidian Vault"),
            Path.Combine(home, "Obsidian"),
            Path.Combine(home, "Documents", "Obsidian"),
        ];
        var detected = candidates
            .Where(Directory.Exists)
            .Where(p => Directory.Exists(Path.Combine(p, ".obsidian")))
            .Select(p => new ObsidianVaultEntry(p, Path.GetFileName(p)))
            .ToArray();
        return new ObsidianDetectionResult(detected, candidates);
    }
}
