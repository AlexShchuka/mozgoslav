using System.Threading;
using System.Threading.Tasks;

namespace Mozgoslav.Application.Interfaces;

public interface IAudioConverter
{
    Task<string> ConvertToWavAsync(string inputPath, CancellationToken ct);
}
