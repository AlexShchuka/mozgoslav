namespace Mozgoslav.Infrastructure.Configuration;

public sealed class SummaryWeeklyOptions
{
    public bool Enabled { get; set; } = true;
    public string Cron { get; set; } = "0 0 3 ? * SUN";
}

public sealed class SummaryMonthlyOptions
{
    public bool Enabled { get; set; } = true;
    public string Cron { get; set; } = "0 0 3 1 * ?";
}

public sealed class SummaryOptions
{
    public const string SectionName = "Mozgoslav:Summaries";

    public SummaryWeeklyOptions Weekly { get; set; } = new();
    public SummaryMonthlyOptions Monthly { get; set; } = new();
    public string OutputFolder { get; set; } = "aggregated";
}
