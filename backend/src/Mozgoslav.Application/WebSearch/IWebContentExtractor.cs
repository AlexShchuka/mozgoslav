using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.WebSearch;

public interface IWebContentExtractor
{
    Task<WebContent> ExtractAsync(string url, CancellationToken ct);
}

public sealed record WebContent(string Title, string Body, string? Lang, string? Excerpt);
