using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Application.WebSearch;

namespace Mozgoslav.Infrastructure.WebSearch;

public sealed class NoOpWebSearch : IWebSearch
{
    public Task<IReadOnlyList<WebSearchResult>> SearchAsync(
        string query, int top, CancellationToken ct)
    {
        IReadOnlyList<WebSearchResult> empty = [];
        return Task.FromResult(empty);
    }
}
