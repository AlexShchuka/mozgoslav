using System.Collections.Generic;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Api.GraphQL.Profiles;

public sealed record CreateProfileInput(
    string Name,
    string SystemPrompt,
    string OutputTemplate,
    CleanupLevel CleanupLevel,
    string ExportFolder,
    IReadOnlyList<string> AutoTags,
    IReadOnlyList<string> Glossary,
    bool LlmCorrectionEnabled,
    bool IsDefault);
