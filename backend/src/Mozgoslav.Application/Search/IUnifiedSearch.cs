using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Search;

public interface IUnifiedSearch
{
    Task<UnifiedSearchResult> AnswerAsync(UnifiedSearchQuery query, CancellationToken ct);
}
