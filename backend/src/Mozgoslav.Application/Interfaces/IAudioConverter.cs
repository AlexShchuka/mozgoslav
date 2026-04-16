namespace Mozgoslav.Application.Interfaces;

/// <summary>
/// Converts arbitrary audio input into 16 kHz mono WAV suitable for Whisper.
/// </summary>
public interface IAudioConverter
{
    Task<string> ConvertToWavAsync(string inputPath, CancellationToken ct);
}
