using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.WebSearch;

public interface IWebSearch
{
    Task<IReadOnlyList<WebSearchResult>> SearchAsync(string query, int top, CancellationToken ct);
}

public sealed record WebSearchResult(string Title, string Url, string Snippet);
