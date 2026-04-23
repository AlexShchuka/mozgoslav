using System;
using System.Collections.Generic;
using System.Linq;

namespace Mozgoslav.Api.Models;

public static class ModelCatalog
{
    public static IReadOnlyList<CatalogEntry> All { get; } =
    [
        new(
            Id: "whisper-small-russian-bundle",
            Name: "Whisper Small (Russian starter, bundled)",
            Description: "Базовая STT-модель, поставляется с приложением. Русская речь на M1/M2 за разумное время.",
            Url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q8_0.bin",
            SizeMb: 260,
            Kind: ModelKind.Stt,
            Tier: ModelTier.Bundle,
            IsDefault: false),
        new(
            Id: "whisper-large-v3-russian-antony66",
            Name: "Whisper Large v3 Russian (antony66) — рекомендуется для RU",
            Description: "RU fine-tune на Common Voice 17 — WER 6.39% (vs 9.84% у базового). GGML-конверсия от Limtech.",
            Url: "https://huggingface.co/Limtech/whisper-large-v3-russian-ggml/resolve/main/ggml-model-q8_0.bin",
            SizeMb: 1600,
            Kind: ModelKind.Stt,
            Tier: ModelTier.Downloadable,
            IsDefault: true),
        new(
            Id: "whisper-large-v3-ru-podlodka",
            Name: "Whisper Large v3 Podlodka (bond005, RU fine-tune)",
            Description: "RU fine-tune на подкастах — заметно лучше на живой разговорной речи.",
            Url: "https://huggingface.co/bond005/whisper-large-v3-ru-podlodka/resolve/main/ggml-model-q8_0.bin",
            SizeMb: 1600,
            Kind: ModelKind.Stt,
            Tier: ModelTier.Downloadable,
            IsDefault: false),
        new(
            Id: "whisper-large-v3-q8",
            Name: "Whisper Large v3 (Q8, multilingual)",
            Description: "Мультиязычный дефолт от ggerganov. Стабилен, но на RU проигрывает fine-tune'ам.",
            Url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-q8_0.bin",
            SizeMb: 1500,
            Kind: ModelKind.Stt,
            Tier: ModelTier.Downloadable,
            IsDefault: false),
        new(
            Id: "whisper-large-v3-turbo",
            Name: "Whisper Large v3 Turbo",
            Description: "Быстрее, чуть хуже качество, multilingual.",
            Url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q8_0.bin",
            SizeMb: 874,
            Kind: ModelKind.Stt,
            Tier: ModelTier.Downloadable,
            IsDefault: false),
        new(
            Id: "whisper-medium",
            Name: "Whisper Medium",
            Description: "Лёгкая модель для слабых машин.",
            Url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium-q8_0.bin",
            SizeMb: 500,
            Kind: ModelKind.Stt,
            Tier: ModelTier.Downloadable,
            IsDefault: false),

        new(
            Id: "silero-vad",
            Name: "Silero VAD v6.2.0",
            Description: "Voice Activity Detection — пропускает тишину перед Whisper.",
            Url: "https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v6.2.0.bin",
            SizeMb: 4,
            Kind: ModelKind.Vad,
            Tier: ModelTier.Bundle,
            IsDefault: true),

        new(
            Id: "audeering-age-gender",
            Name: "audeering age-gender (wav2vec2)",
            Description: "Голосовая классификация пола. Примерно 380 МБ, опциональная установка.",
            Url: "https://huggingface.co/audeering/wav2vec2-large-robust-24-ft-age-gender",
            SizeMb: 380,
            Kind: ModelKind.AudioMl,
            Tier: ModelTier.Downloadable,
            IsDefault: false),
        new(
            Id: "audeering-emotion-msp-dim",
            Name: "audeering emotion MSP-dim (wav2vec2)",
            Description: "Голосовая классификация эмоций (arousal/valence/dominance). ~380 МБ.",
            Url: "https://huggingface.co/audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim",
            SizeMb: 380,
            Kind: ModelKind.AudioMl,
            Tier: ModelTier.Downloadable,
            IsDefault: false)
    ];

    private static readonly IReadOnlyDictionary<string, string> Aliases =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["antony66-ggml"] = "whisper-large-v3-russian-antony66",
        };

    public static CatalogEntry? TryGet(string id)
    {
        if (Aliases.TryGetValue(id, out var canonicalId))
        {
            id = canonicalId;
        }
        return All.FirstOrDefault(e => e.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
    }
}
