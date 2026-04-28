namespace Mozgoslav.Infrastructure.Configuration;

public sealed class NativeHelperOptions
{
    public const string SectionName = "Mozgoslav:NativeHelper";

    public string GrpcEndpoint { get; set; } = "http://127.0.0.1:50051";
}
