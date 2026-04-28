using System;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Routines;

namespace Mozgoslav.Api.GraphQL.Routines;

[ExtendObjectType(typeof(MutationType))]
public sealed class RoutinesMutationType
{
    public async Task<RoutineDefinitionDto> ToggleRoutine(
        string key,
        bool enabled,
        [Service] IRoutineRegistry registry,
        CancellationToken ct)
    {
        await registry.ToggleAsync(key, enabled, ct);
        var definitions = await registry.ListAsync(ct);
        foreach (var def in definitions)
        {
            if (def.Key == key)
            {
                var lastRun = def.LastRun is null
                    ? null
                    : new RoutineRunDto(
                        def.LastRun.Id,
                        def.LastRun.RoutineKey,
                        def.LastRun.StartedAt,
                        def.LastRun.FinishedAt,
                        def.LastRun.Status,
                        def.LastRun.ErrorMessage,
                        def.LastRun.PayloadSummary);
                return new RoutineDefinitionDto(def.Key, def.DisplayName, def.Description, def.IsEnabled, lastRun);
            }
        }
        throw new InvalidOperationException($"Routine not found after toggle: {key}");
    }

    public async Task<RoutineRunDto> RunRoutineNow(
        string key,
        [Service] IRoutineRegistry registry,
        CancellationToken ct)
    {
        var run = await registry.RunNowAsync(key, ct);
        return new RoutineRunDto(
            run.Id,
            run.RoutineKey,
            run.StartedAt,
            run.FinishedAt,
            run.Status,
            run.ErrorMessage,
            run.PayloadSummary);
    }
}
