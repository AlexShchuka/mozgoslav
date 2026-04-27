namespace Mozgoslav.Infrastructure.Search;

public sealed class UnifiedSearchOptions
{
    public const string SectionName = "Mozgoslav:Search:Unified";

    public bool DefaultIncludeWeb { get; set; } = true;
    public int MaxToolCalls { get; set; } = 10;
}
