namespace Mozgoslav.Infrastructure.Configuration;

/// <summary>
/// Options for <see cref="Services.AVFoundationAudioRecorder"/>.
/// Config section: <c>Mozgoslav:AudioRecorder</c>. Environment-variable
/// override: <c>Mozgoslav__AudioRecorder__ElectronBridgePort</c>, set by
/// <c>frontend/electron/utils/backendLauncher.ts</c> at backend spawn time.
/// </summary>
public sealed class AudioRecorderOptions
{
    public const string SectionName = "Mozgoslav:AudioRecorder";

    /// <summary>
    /// Port of the Electron loopback bridge. Null or 0 means no bridge is
    /// available (backend launched stand-alone) and <c>AVFoundationAudioRecorder.IsSupported</c>
    /// returns <c>false</c>.
    /// </summary>
    public int? ElectronBridgePort { get; set; }
}
