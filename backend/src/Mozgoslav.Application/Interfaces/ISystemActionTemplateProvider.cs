using System.Collections.Generic;

namespace Mozgoslav.Application.Interfaces;

public interface ISystemActionTemplateProvider
{
    IReadOnlyList<SystemActionTemplate> GetTemplates();
}

public sealed record SystemActionTemplate(
    string Name,
    string Description,
    string DeeplinkUrl);
