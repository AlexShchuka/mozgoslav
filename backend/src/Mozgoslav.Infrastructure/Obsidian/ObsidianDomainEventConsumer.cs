using System;
using System.Threading;
using System.Threading.Channels;
using System.Threading.Tasks;

using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;

namespace Mozgoslav.Infrastructure.Obsidian;

public sealed class ObsidianDomainEventConsumer : BackgroundService
{
    private const int QueueCapacity = 128;

    private readonly IDomainEventBus _bus;
    private readonly IServiceScopeFactory _scopes;
    private readonly ILogger<ObsidianDomainEventConsumer> _logger;
    private readonly Channel<PendingExport> _queue = Channel.CreateBounded<PendingExport>(
        new BoundedChannelOptions(QueueCapacity)
        {
            FullMode = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
            SingleWriter = false
        });

    public ObsidianDomainEventConsumer(
        IDomainEventBus bus,
        IServiceScopeFactory scopes,
        ILogger<ObsidianDomainEventConsumer> logger)
    {
        _bus = bus;
        _scopes = scopes;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var consumer = ConsumeAsync(stoppingToken);

        try
        {
            await foreach (var evt in _bus.SubscribeAsync<ProcessedNoteSaved>(stoppingToken))
            {
                await HandleEventAsync(evt, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
        }
        finally
        {
            _queue.Writer.TryComplete();
            try
            {
                await consumer;
            }
            catch (OperationCanceledException)
            {
            }
        }
    }

    private async Task HandleEventAsync(ProcessedNoteSaved evt, CancellationToken ct)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            var settings = scope.ServiceProvider.GetRequiredService<IAppSettings>();
            if (!settings.ObsidianFeatureEnabled || string.IsNullOrWhiteSpace(settings.VaultPath))
            {
                return;
            }
            var notes = scope.ServiceProvider.GetRequiredService<IProcessedNoteRepository>();
            var profiles = scope.ServiceProvider.GetRequiredService<IProfileRepository>();

            var note = await notes.GetByIdAsync(evt.NoteId, ct);
            if (note is null)
            {
                _logger.LogWarning("ProcessedNoteSaved received for unknown note {NoteId}", evt.NoteId);
                return;
            }
            var profile = await profiles.GetByIdAsync(evt.ProfileId, ct);
            if (profile is null)
            {
                _logger.LogWarning("ProcessedNoteSaved received for unknown profile {ProfileId}", evt.ProfileId);
                return;
            }

            var relativePath = VaultPathPlanner.ComputeRelativePath(note, profile);
            var write = new VaultNoteWrite(relativePath, note.MarkdownContent);
            var pending = new PendingExport(evt.NoteId, write);
            await _queue.Writer.WriteAsync(pending, ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enqueue Obsidian export for note {NoteId}", evt.NoteId);
        }
    }

    private async Task ConsumeAsync(CancellationToken ct)
    {
        try
        {
            await foreach (var pending in _queue.Reader.ReadAllAsync(ct))
            {
                await WriteAndUpdateAsync(pending, ct);
            }
        }
        catch (OperationCanceledException)
        {
        }
    }

    private async Task WriteAndUpdateAsync(PendingExport pending, CancellationToken ct)
    {
        try
        {
            using var scope = _scopes.CreateScope();
            var driver = scope.ServiceProvider.GetRequiredService<IVaultDriver>();
            var notes = scope.ServiceProvider.GetRequiredService<IProcessedNoteRepository>();

            var receipt = await driver.WriteNoteAsync(pending.Write, ct);

            var note = await notes.GetByIdAsync(pending.NoteId, ct);
            if (note is null)
            {
                _logger.LogWarning("Note {NoteId} disappeared before export flag could be persisted", pending.NoteId);
                return;
            }
            note.ExportedToVault = true;
            note.VaultPath = receipt.VaultRelativePath;
            await notes.UpdateAsync(note, ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Obsidian vault write failed for note {NoteId} — dropping", pending.NoteId);
        }
    }

    private sealed record PendingExport(Guid NoteId, VaultNoteWrite Write);
}
