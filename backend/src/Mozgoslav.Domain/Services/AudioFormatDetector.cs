using System;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Services;

public static class AudioFormatDetector
{
    public static AudioFormat FromExtension(string extension)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(extension);

        var normalized = extension.StartsWith('.')
            ? extension[1..]
            : extension;

        return normalized.ToLowerInvariant() switch
        {
            "mp3" => AudioFormat.Mp3,
            "m4a" => AudioFormat.M4A,
            "wav" => AudioFormat.Wav,
            "mp4" => AudioFormat.Mp4,
            "ogg" => AudioFormat.Ogg,
            "flac" => AudioFormat.Flac,
            "webm" => AudioFormat.Webm,
            "aac" => AudioFormat.Aac,
            _ => throw new ArgumentException($"Unsupported audio format: {extension}", nameof(extension))
        };
    }

    public static bool TryFromExtension(string extension, out AudioFormat format)
    {
        try
        {
            format = FromExtension(extension);
            return true;
        }
        catch (ArgumentException)
        {
            format = default;
            return false;
        }
    }
}
