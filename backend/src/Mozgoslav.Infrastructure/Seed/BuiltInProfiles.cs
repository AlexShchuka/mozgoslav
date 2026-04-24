using System;
using System.Collections.Generic;

using Mozgoslav.Domain.Entities;
using Mozgoslav.Domain.Enums;

namespace Mozgoslav.Infrastructure.Seed;

public static class BuiltInProfiles
{
    private static readonly Guid WorkId = new("00000000-0000-0000-0000-00000000A001");
    private static readonly Guid PersonalId = new("00000000-0000-0000-0000-00000000A002");
    private static readonly Guid FullId = new("00000000-0000-0000-0000-00000000A003");

    public static Profile Work { get; } = new()
    {
        Id = WorkId,
        Name = "Рабочий",
        IsBuiltIn = true,
        IsDefault = true,
        CleanupLevel = CleanupLevel.Aggressive,
        ExportFolder = "_inbox",
        AutoTags = ["meeting", "work"],
        SystemPrompt = """
            Ты ассистент для обработки записей рабочих встреч.
            Язык ответа: русский.
            На входе — расшифровка разговора.
            Выкидывай small talk, шутки, болтовню.
            Верни JSON:
            {
              "summary": "краткое изложение (3-5 предложений)",
              "key_points": ["тезис 1", ...],
              "decisions": ["решение 1", ...],
              "action_items": [{"person": "Имя", "task": "Что", "deadline": "Когда"}],
              "unresolved_questions": ["вопрос 1", ...],
              "participants": ["Имя 1", ...],
              "topic": "тема",
              "conversation_type": "meeting",
              "tags": ["tag1", ...]
            }
            """
    };

    public static Profile Personal { get; } = new()
    {
        Id = PersonalId,
        Name = "Неформальный",
        IsBuiltIn = true,
        CleanupLevel = CleanupLevel.Light,
        ExportFolder = "_inbox",
        AutoTags = ["personal"],
        SystemPrompt = """
            Ты ассистент. Обработай запись неформального разговора.
            Язык: русский.
            Сохрани общий смысл, контекст, шутки как шутки.
            НЕ делай сухой протокол.
            Верни JSON: {"summary", "key_points", "participants", "topic", "conversation_type": "personal", "tags"}
            """
    };

    public static Profile Full { get; } = new()
    {
        Id = FullId,
        Name = "Полная заметка",
        IsBuiltIn = true,
        CleanupLevel = CleanupLevel.None,
        ExportFolder = "_inbox",
        AutoTags = ["full"],
        SystemPrompt = """
            Обработай запись разговора. Сохрани ВСЁ.
            Язык: русский.
            Верни JSON: {"summary", "key_points", "decisions", "action_items", "unresolved_questions", "participants", "topic", "conversation_type", "tags"}
            """
    };

    public static IReadOnlyList<Profile> All { get; } = [Work, Personal, Full];
}
