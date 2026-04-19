using System.Text.RegularExpressions;

using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Domain.Services;

/// <summary>
/// Removes Russian conversational filler words from transcripts.
/// See DEFAULT-CONFIG §7 for the dictionary.
/// </summary>
public static class FillerCleaner
{
    private static readonly string[] LightFillers =
    [
        "ну", "это", "типа", "короче", "вот", "блин", "значит",
        "как бы", "в общем", "в принципе", "так сказать",
        "эээ", "ээ", "эх", "мм", "ммм", "мммм", "эм", "ээм"
    ];

    private static readonly string[] AggressivePhrases =
    [
        "ну вот", "ну это", "ну типа", "вот это", "ну короче"
    ];

    private static readonly Regex WhitespaceRegex = new(@"\s+", RegexOptions.Compiled);

    public static string Clean(string text, CleanupLevel level)
    {
        if (string.IsNullOrWhiteSpace(text) || level == CleanupLevel.None)
        {
            return text;
        }

        var result = text;

        if (level == CleanupLevel.Aggressive)
        {
            foreach (var phrase in AggressivePhrases)
            {
                result = RemoveWholeWord(result, phrase);
            }
        }

        foreach (var filler in LightFillers)
        {
            result = RemoveWholeWord(result, filler);
        }

        result = WhitespaceRegex.Replace(result, " ");
        result = Regex.Replace(result, @"\s+([,.!?;:])", "$1");
        result = Regex.Replace(result, @"([,.!?;:])\1+", "$1");

        return result.Trim();
    }

    private static string RemoveWholeWord(string input, string word)
    {
        var escaped = Regex.Escape(word);
        var pattern = $@"(?<=^|[\s,.!?;:\-—])({escaped})(?=[\s,.!?;:\-—]|$)";
        return Regex.Replace(input, pattern, string.Empty, RegexOptions.IgnoreCase);
    }
}
