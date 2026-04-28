using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using HotChocolate;
using HotChocolate.Types;

using Mozgoslav.Api.GraphQL.Queries;
using Mozgoslav.Application.Search;

namespace Mozgoslav.Api.GraphQL.Search;

[ExtendObjectType(typeof(QueryType))]
public sealed class SearchQueryType
{
    public async Task<UnifiedSearchPayload> UnifiedSearch(
        string query,
        bool? includeWeb,
        [Service] IUnifiedSearch search,
        CancellationToken ct)
    {
        var q = new UnifiedSearchQuery(
            Query: query,
            Filter: null,
            IncludeWeb: includeWeb ?? true);

        var result = await search.AnswerAsync(q, ct);

        return new UnifiedSearchPayload(
            Answer: result.Answer,
            Citations: result.Citations.Select(c => new UnifiedCitationDto(
                Source: c.Source.ToString(),
                Reference: c.Reference,
                Snippet: c.Snippet,
                Url: c.Url)).ToArray());
    }
}
