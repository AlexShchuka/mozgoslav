using System;
using System.Threading.Tasks;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.UseCases;

using Quartz;

namespace Mozgoslav.Infrastructure.Jobs;

[DisallowConcurrentExecution]
public sealed class MonthlyAggregatedSummaryJob : IJob
{
    public const string JobGroup = "mozgoslav.summaries";

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MonthlyAggregatedSummaryJob> _logger;

    public MonthlyAggregatedSummaryJob(
        IServiceScopeFactory scopeFactory,
        ILogger<MonthlyAggregatedSummaryJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task Execute(IJobExecutionContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        _logger.LogInformation("MonthlyAggregatedSummaryJob started");

        await using var scope = _scopeFactory.CreateAsyncScope();
        var useCase = scope.ServiceProvider.GetRequiredService<AggregateSummaryUseCase>();
        var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();

        var now = DateTimeOffset.UtcNow;
        var monthStart = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);
        var period = SummaryPeriod.Monthly(monthStart);

        await useCase.ExecuteAsync(period, settings.VaultPath, context.CancellationToken)
            .ConfigureAwait(false);
    }
}
