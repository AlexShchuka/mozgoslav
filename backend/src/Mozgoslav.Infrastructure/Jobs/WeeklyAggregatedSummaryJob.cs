using System;
using System.Threading.Tasks;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;

using Quartz;

namespace Mozgoslav.Infrastructure.Jobs;

[DisallowConcurrentExecution]
public sealed class WeeklyAggregatedSummaryJob : IJob
{
    public const string JobGroup = "mozgoslav.summaries";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<WeeklyAggregatedSummaryJob> _logger;

    public WeeklyAggregatedSummaryJob(
        IServiceScopeFactory scopeFactory,
        ILogger<WeeklyAggregatedSummaryJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        _logger.LogInformation("WeeklyAggregatedSummaryJob started");

        await using var scope = _scopeFactory.CreateAsyncScope();
        var useCase = scope.ServiceProvider.GetRequiredService<AggregateSummaryUseCase>();
        var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();

        var now = DateTimeOffset.UtcNow;
        var dayOfWeek = (int)now.DayOfWeek;
        var daysToMonday = dayOfWeek == 0 ? 6 : dayOfWeek - 1;
        var weekStart = now.AddDays(-daysToMonday).Date;
        var period = SummaryPeriod.Weekly(new DateTimeOffset(weekStart, TimeSpan.Zero));

        await useCase.ExecuteAsync(period, settings.VaultPath, context.CancellationToken)
            .ConfigureAwait(false);
    }
}
