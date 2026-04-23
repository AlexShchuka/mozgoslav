namespace Mozgoslav.Infrastructure.Configuration;

public sealed class AudioRecorderOptions
{
    public const string SectionName = "Mozgoslav:AudioRecorder";

    public int? ElectronBridgePort { get; set; }
}
