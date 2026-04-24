using System.Collections.Generic;

namespace Mozgoslav.Api.GraphQL.Logs;

public sealed record LogTailResult(
    string File,
    IReadOnlyList<string> Lines,
    int TotalLines);
