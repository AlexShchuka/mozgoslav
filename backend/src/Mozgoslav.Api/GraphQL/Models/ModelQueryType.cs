using System.Collections.Generic;
using System.IO;
using System.Linq;

using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Api.Models;
using Mozgoslav.Infrastructure.Platform;

namespace Mozgoslav.Api.GraphQL.Models;

[ExtendObjectType(typeof(QueryType))]
public sealed class ModelQueryType
{
    public IReadOnlyList<ModelEntry> Models()
    {
        return ModelCatalog.All.Select(m =>
        {
            var destinationPath = ResolveDestination(m);
            return new ModelEntry(
                m.Id,
                m.Name,
                m.Description,
                m.Url,
                m.SizeMb,
                m.Kind,
                m.Tier,
                m.IsDefault,
                destinationPath,
                Installed: File.Exists(destinationPath));
        }).ToList();
    }

    private static string ResolveDestination(CatalogEntry entry)
    {
        var fileName = Path.GetFileName(new System.Uri(entry.Url).AbsolutePath);
        return Path.Combine(AppPaths.Models, fileName);
    }
}
