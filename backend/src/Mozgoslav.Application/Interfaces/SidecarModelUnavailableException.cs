using System;

namespace Mozgoslav.Application.Interfaces;

public sealed class SidecarModelUnavailableException : Exception
{
    public string ModelId { get; }

    public string DownloadUrl { get; }

    public string Hint { get; }

    public SidecarModelUnavailableException(
        string modelId,
        string downloadUrl,
        string hint)
        : base($"Sidecar reports model '{modelId}' is not installed. Download from {downloadUrl}.")
    {
        ModelId = modelId;
        DownloadUrl = downloadUrl;
        Hint = hint;
    }
}
