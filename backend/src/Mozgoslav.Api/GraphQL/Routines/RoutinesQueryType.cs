using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Routines;

namespace Mozgoslav.Api.GraphQL.Routines;

[ExtendObjectType(typeof(QueryType))]
public sealed class RoutinesQueryType
{
    public async Task<IReadOnlyList<RoutineDefinitionDto>> Routines(
        [Service] IRoutineRegistry registry,
        CancellationToken ct)
    {
        var definitions = await registry.ListAsync(ct);
        return definitions.Select(MapToDto).ToList();
    }

    public async Task<IReadOnlyList<RoutineRunDto>> RoutineRuns(
        string key,
        int limit,
        [Service] IRoutineRunRepository runRepository,
        CancellationToken ct)
    {
        var runs = await runRepository.ListByKeyAsync(key, limit, ct);
        return runs.Select(MapRunToDto).ToList();
    }

    private static RoutineDefinitionDto MapToDto(RoutineDefinition d) =>
        new(
            d.Key,
            d.DisplayName,
            d.Description,
            d.IsEnabled,
            d.LastRun is null ? null : MapRunToDto(d.LastRun));

    private static RoutineRunDto MapRunToDto(Domain.Entities.RoutineRun r) =>
        new(r.Id, r.RoutineKey, r.StartedAt, r.FinishedAt, r.Status, r.ErrorMessage, r.PayloadSummary);
}

public sealed record RoutineDefinitionDto(
    string Key,
    string DisplayName,
    string Description,
    bool IsEnabled,
    RoutineRunDto? LastRun);

public sealed record RoutineRunDto(
    Guid Id,
    string RoutineKey,
    DateTimeOffset StartedAt,
    DateTimeOffset? FinishedAt,
    string Status,
    string? ErrorMessage,
    string? PayloadSummary);
