using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Prompts;

namespace Mozgoslav.Api.GraphQL.Prompts;

[ExtendObjectType(typeof(QueryType))]
public sealed class PromptsQueryType
{
    public async Task<IReadOnlyList<PromptTemplateDto>> PromptTemplates(
        [Service] IPromptTemplateRepository repository,
        CancellationToken ct)
    {
        var templates = await repository.GetAllAsync(ct);
        return templates.Select(MapToDto).ToList();
    }

    public async Task<PromptTemplateDto?> PromptTemplate(
        Guid id,
        [Service] IPromptTemplateRepository repository,
        CancellationToken ct)
    {
        var template = await repository.GetByIdAsync(id, ct);
        return template is null ? null : MapToDto(template);
    }

    public async Task<string> PreviewPrompt(
        string templateBody,
        [Service] IPromptBuilder builder,
        CancellationToken ct)
    {
        return await builder.BuildAsync(templateBody, new Dictionary<string, string>(), ct);
    }

    private static PromptTemplateDto MapToDto(PromptTemplate t) =>
        new(t.Id, t.Name, t.Body, t.CreatedAt);
}

public sealed record PromptTemplateDto(Guid Id, string Name, string Body, DateTimeOffset CreatedAt);
