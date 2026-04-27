using System.Collections.Generic;

namespace Mozgoslav.Application.Agents;

public sealed record AgentRunResult(
    string FinalAnswer,
    IReadOnlyList<string> ToolCallTrace,
    IReadOnlyList<string> Citations,
    bool AgentsEnabled);
