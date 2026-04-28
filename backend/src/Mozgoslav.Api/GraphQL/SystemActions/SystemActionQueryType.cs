using System.Collections.Generic;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Interfaces;

namespace Mozgoslav.Api.GraphQL.SystemActions;

[ExtendObjectType(typeof(QueryType))]
public sealed class SystemActionQueryType
{
    public IReadOnlyList<SystemActionTemplateDto> SystemActionTemplates(
        [Service] ISystemActionTemplateProvider provider)
    {
        var templates = provider.GetTemplates();
        var result = new SystemActionTemplateDto[templates.Count];
        for (var i = 0; i < templates.Count; i++)
        {
            result[i] = new SystemActionTemplateDto(
                templates[i].Name,
                templates[i].Description,
                templates[i].DeeplinkUrl);
        }
        return result;
    }
}

public sealed record SystemActionTemplateDto(
    string Name,
    string Description,
    string DeeplinkUrl);
