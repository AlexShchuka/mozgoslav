namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Raised by <see cref="IPythonSidecarClient"/> when the sidecar
/// answers with a 503 + <c>model_not_installed</c> envelope.
/// The C# layer catches this and surfaces the catalogue id / download
/// URL to the Queue UI so the user can one-click install.
/// </summary>
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
