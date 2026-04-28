namespace Mozgoslav.Infrastructure.Mcp;

public sealed class McpServerOptions
{
    public const string SectionName = "Mozgoslav:Mcp";

    public bool Enabled { get; set; }
    public int Port { get; set; } = 51051;
    public string Token { get; set; } = string.Empty;
}
