using System.Collections.Generic;

namespace Mozgoslav.Application.Agents;

public sealed record AgentRunRequest(
    string Prompt,
    string SystemPrompt,
    IReadOnlyList<string> ToolNames,
    string? ModelHint);
