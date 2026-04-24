using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Rag;

public interface IEmbeddingService
{
    int Dimensions { get; }

    Task<float[]> EmbedAsync(string text, CancellationToken ct);
}
