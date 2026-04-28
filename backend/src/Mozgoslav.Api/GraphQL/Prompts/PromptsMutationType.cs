using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Mutations;
using Mozgoslav.Application.Prompts;

namespace Mozgoslav.Api.GraphQL.Prompts;

[ExtendObjectType(typeof(MutationType))]
public sealed class PromptsMutationType
{
    public async Task<PromptTemplateDto> CreatePromptTemplate(
        string name,
        string body,
        [Service] IPromptTemplateRepository repository,
        CancellationToken ct)
    {
        var template = new PromptTemplate(
            Id: Guid.NewGuid(),
            Name: name,
            Body: body,
            CreatedAt: DateTimeOffset.UtcNow);
        var saved = await repository.AddAsync(template, ct);
        return new PromptTemplateDto(saved.Id, saved.Name, saved.Body, saved.CreatedAt);
    }

    public async Task<PromptTemplateDto?> UpdatePromptTemplate(
        Guid id,
        string name,
        string body,
        [Service] IPromptTemplateRepository repository,
        CancellationToken ct)
    {
        var existing = await repository.GetByIdAsync(id, ct);
        if (existing is null)
        {
            return null;
        }
        var updated = existing with { Name = name, Body = body };
        await repository.UpdateAsync(updated, ct);
        return new PromptTemplateDto(updated.Id, updated.Name, updated.Body, updated.CreatedAt);
    }

    public async Task<bool> DeletePromptTemplate(
        Guid id,
        [Service] IPromptTemplateRepository repository,
        CancellationToken ct)
    {
        return await repository.TryDeleteAsync(id, ct);
    }

    public async Task<string> BuildPrompt(
        string template,
        [Service] IPromptBuilder builder,
        CancellationToken ct)
    {
        return await builder.BuildAsync(template, new Dictionary<string, string>(), ct);
    }
}
