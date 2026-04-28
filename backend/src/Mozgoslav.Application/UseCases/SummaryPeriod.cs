using System;
using System.Globalization;

namespace Mozgoslav.Application.UseCases;

public sealed record SummaryPeriod(
    DateTimeOffset From,
    DateTimeOffset To,
    string Label)
{
    public static SummaryPeriod Weekly(DateTimeOffset weekStart)
    {
        var date = weekStart.UtcDateTime;
        var isoYear = ISOWeek.GetYear(date);
        var isoWeek = ISOWeek.GetWeekOfYear(date);
        var label = $"weekly-{isoYear:D4}-W{isoWeek:D2}";
        return new SummaryPeriod(weekStart, weekStart.AddDays(7), label);
    }

    public static SummaryPeriod Monthly(DateTimeOffset monthStart)
    {
        var label = $"monthly-{monthStart.Year:D4}-{monthStart.Month:D2}";
        var to = monthStart.AddMonths(1);
        return new SummaryPeriod(monthStart, to, label);
    }
}
