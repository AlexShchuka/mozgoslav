using System.Collections.Generic;

namespace Mozgoslav.Application.Monitoring;

public sealed record RuntimeState(
    LlmRuntimeState Llm,
    SyncthingRuntimeState Syncthing,
    IReadOnlyList<SupervisorServiceState> Services);
