using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

using Mozgoslav.Domain.ValueObjects;

namespace Mozgoslav.Application.Interfaces;

public interface IPythonSidecarClient
{
    Task<SidecarDiarizeResult> DiarizeAsync(string audioPath, CancellationToken ct);

    Task<SidecarGenderResult> GenderAsync(string audioPath, CancellationToken ct);

    Task<SidecarEmotionResult> EmotionAsync(string audioPath, CancellationToken ct);

    Task<SidecarNerResult> NerAsync(string text, CancellationToken ct);

    Task<SidecarProcessAllResult> ProcessAllAsync(
        string audioPath,
        IReadOnlyList<string>? steps,
        CancellationToken ct);
}
