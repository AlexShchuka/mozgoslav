using System;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;

using Microsoft.Extensions.Logging;

using Mozgoslav.Application.Interfaces;
using Mozgoslav.Application.Obsidian;
using Mozgoslav.Application.Search;

namespace Mozgoslav.Application.UseCases;

public sealed class AskFromVoiceUseCase
{
    private readonly IDictationSessionManager _dictation;
    private readonly IUnifiedSearch _search;
    private readonly IVaultDriver _vault;
    private readonly IAppSettings _settings;
    private readonly ILogger<AskFromVoiceUseCase> _logger;

    public AskFromVoiceUseCase(
        IDictationSessionManager dictation,
        IUnifiedSearch search,
        IVaultDriver vault,
        IAppSettings settings,
        ILogger<AskFromVoiceUseCase> logger)
    {
        _dictation = dictation;
        _search = search;
        _vault = vault;
        _settings = settings;
        _logger = logger;
    }

    public async Task<AskFromVoiceResult> ExecuteAsync(Guid dictationSessionId, bool archiveToVault, CancellationToken ct)
    {
        var transcript = await _dictation.StopAsync(dictationSessionId, ct);
        var question = string.IsNullOrWhiteSpace(transcript.PolishedText)
            ? transcript.RawText
            : transcript.PolishedText;

        if (string.IsNullOrWhiteSpace(question))
        {
            return new AskFromVoiceResult(
                Question: string.Empty,
                Answer: string.Empty,
                ArchivePath: null);
        }

        var query = new UnifiedSearchQuery(Query: question, Filter: null, IncludeWeb: true);
        var result = await _search.AnswerAsync(query, ct);

        _logger.LogInformation(
            "AskFromVoice: question={Len} chars, answer={AnswerLen} chars",
            question.Length,
            result.Answer.Length);

        string? archivePath = null;
        if (archiveToVault)
        {
            archivePath = await TryArchiveAsync(question, result.Answer, ct);
        }

        return new AskFromVoiceResult(
            Question: question,
            Answer: result.Answer,
            ArchivePath: archivePath);
    }

    private async Task<string?> TryArchiveAsync(string question, string answer, CancellationToken ct)
    {
        try
        {
            var loaded = await _settings.LoadAsync(ct);
            var exportFolder = string.IsNullOrWhiteSpace(loaded.VaultPath) ? "_inbox" : null;
            var baseFolder = exportFolder ?? "_inbox";
            var date = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            var topic = DeriveTopicSlug(question);
            var relativePath = $"{baseFolder}/queries/{date}-{topic}.md";

            await _vault.EnsureFolderAsync($"{baseFolder}/queries", ct);
            var body = $"# {question}\n\n{answer}";
            await _vault.WriteNoteAsync(new VaultNoteWrite(relativePath, body), ct);
            _logger.LogInformation("AskFromVoice: archived to {Path}", relativePath);
            return relativePath;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "AskFromVoice: archive to vault failed");
            return null;
        }
    }

    private static string DeriveTopicSlug(string question)
    {
        var words = question.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var prefix = string.Join("-", words.Take(5)).ToLowerInvariant();
        return Regex.Replace(prefix, "[^a-z0-9\\-]", string.Empty).Trim('-');
    }
}

public sealed record AskFromVoiceResult(
    string Question,
    string Answer,
    string? ArchivePath);
