# Mozgoslav

Локальный second brain для разговоров и созвонов. Аудио → очистка → транскрибация → коррекция → суммаризация → structured markdown → Obsidian.

Desktop-приложение для macOS Apple Silicon. Всё локально, privacy-first. Ничего не уходит наружу, кроме запросов к LLM-endpoint, который ты сам указал в настройках.

## Установка

1. Скачай последний `Mozgoslav-<version>-arm64.dmg` со страницы Releases.
2. Открой DMG, перетащи `Mozgoslav.app` в `Applications`.
3. **Первый запуск:** правый клик по `Mozgoslav.app` → **Open** → подтверди. DMG в v0.8 не подписан Apple Developer ID — Gatekeeper попросит подтверждение. Подписание / нотаризация — в Phase 2.
4. Запусти приложение, пройди Onboarding (≤ 1 минута). Базовые модели уже встроены в DMG, ничего качать не нужно.

Готово.

## Состав

```
mozgoslav/
├── backend/           C# 14 / .NET 10 ASP.NET Minimal API — EF Core, Whisper.net, OpenAI SDK, Serilog, OpenTelemetry metrics
├── frontend/          Electron + React 19 + TypeScript + Redux-Saga + styled-components + i18n (ru/en)
├── python-sidecar/    FastAPI — реальные ML endpoints (diarize / NER) + downloadable (gender / emotion)
└── docs/
    └── README.md                       как устроено
```

## Модели

### Tier 1 — встроены в DMG (ADR-010)

| Модель | Размер | Назначение |
|---|---|---|
| `whisper-small-q5_0.bin` | ~250 MB | STT — стартовая, RU+EN, qual ≈ medium |
| `ggml-silero-v6.2.0.bin` | ~4 MB | VAD (whisper.cpp) |
| `silero_vad.onnx` | ~2 MB | VAD ONNX (python-sidecar `diarize`) |
| `resemblyzer-state.pt` | ~85 MB | Speaker embeddings для `diarize` |

После установки DMG модели уже на диске. Onboarding пропускает все «скачай X» шаги.

### Tier 2 — скачиваются по требованию из **Settings → Models**

| Модель | Размер | Назначение | Источник |
|---|---|---|---|
| `ggml-large-v3-q8_0.bin` | ~1.5 GB | STT мультиязык — высокое качество | huggingface.co/ggerganov/whisper.cpp |
| `ggml-large-v3-turbo-q8_0.bin` | ~0.9 GB | STT (быстрее, чуть хуже) | huggingface.co/ggerganov/whisper.cpp |
| `ggml-medium-q8_0.bin` | ~0.5 GB | STT (для слабых машин) | huggingface.co/ggerganov/whisper.cpp |
| `audeering/wav2vec2-large-robust-24-ft-age-gender` | ~1.2 GB | Gender / age для python-sidecar `gender` | huggingface.co/audeering |
| `audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim` | ~1.2 GB | Emotion для python-sidecar `emotion` | huggingface.co/audeering |
| `antony66/whisper-large-v3-russian` | ~1.5 GB | RU fine-tune, WER 6.39% | huggingface.co/antony66 |
| `bond005/whisper-large-v3-ru-podlodka` | ~1.5 GB | RU fine-tune, живая речь | huggingface.co/bond005 |

До скачивания соответствующие endpoint'ы возвращают `503 ModelNotAvailableError` с понятным телом — UI подсвечивает фичу как недоступную.

### LLM (внешний endpoint: LM Studio / Ollama / любой OpenAI-compatible / Anthropic)

Приложение не качает LLM — выбираешь в LM Studio / Ollama, указываешь endpoint в **Settings → LLM**. Для M3 36 GB на 2026-04:

| Модель | Размер (Q4_K_M) | Почему |
|---|---|---|
| **Qwen3-32B-Instruct** | ~19 GB | топовый open-source в ~27-32B, отличный русский |
| Qwen3-14B-Instruct | ~9 GB | быстрый дефолт при RAM-дефиците |
| RuadaptQwen3-32B | ~19 GB | RU fine-tune Qwen3-32B |
| Gemma 3 27B-it | ~16 GB | 128K контекст, длинные transcript'ы в один проход |
| Vikhr-Nemo-12B | ~7 GB | RU fine-tune Mistral-Nemo, лёгкий |

Приложение выставляет `temperature=0.1` и `response_format=json_schema`. Маршрутизация по `Settings → LLM Provider` (OpenAI-compatible / Anthropic / Ollama).

Пути скачанных STT/VAD моделей: `~/Library/Application Support/Mozgoslav/models/`.

## Первая настройка (после Onboarding)

1. **Settings → LLM** — endpoint (`http://localhost:1234` для LM Studio), при необходимости API-key.
2. **Settings → Storage → Obsidian** — путь к Obsidian vault. Если установлен плагин **Local REST API** — вставь токен; «Open in Obsidian» будет фокусировать заметку прямо в окне Obsidian. Без плагина — fallback через `obsidian://` URI.
3. **Settings → Whisper** или **Models → Download** — если базовых Tier 1 моделей мало, качай Tier 2.
4. Есть Meetily.app? В **Import from Meetily** укажи путь к `meeting_minutes.sqlite` — все встречи подтянутся.

## Privacy & security

- Electron: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Preload whitelistит только `openAudioFiles / openFolder / openPath`.
- CSP: `default-src 'self'`, `connect-src 'self' http://localhost:5050 ws://localhost:5173 http://localhost:5173`. Никаких внешних адресов.
- Kestrel слушает **только** `localhost:5050`. CORS — localhost и `app://mozgoslav`.
- Все секреты (LLM API key, Obsidian token) живут в SQLite `settings`. Никогда не передаются никуда, кроме endpoint'а, куда явно адресованы.
- Zero telemetry. Никаких crash-reporters / analytics / auto-update checks.
- Логи — только локально в `~/Library/Application Support/Mozgoslav/logs/`. Просматривать прямо в UI (Logs page).
- Downloads моделей — только HuggingFace HTTPS URL из встроенного каталога (`ModelCatalog.cs`) либо релиз `models-bundle-v1` (sha256-checked).

## Recording playback caveat

Playback through Bluetooth headphones may sound distorted — your recording is fine, it's a playback driver issue. См. [docs/bluetooth-playback-notice.md](docs/bluetooth-playback-notice.md).

## Бэкапы

UI → **Backups → Create**, или `POST /api/backup/create`. Складывается zip в `~/Library/Application Support/Mozgoslav/backups/` (база + конфиг, без логов). Восстановить — распаковать в ту же папку.

## Ограничения v0.8

- Запись с микрофона есть на macOS (AVFoundation). На Linux/Windows backend поднимется, но `IAudioRecorder` вернёт «platform unsupported».
- DMG не подписан Apple Developer ID — Gatekeeper выдаёт предупреждение при первом запуске (см. «Установка» выше). Подписание / нотаризация — Phase 2.
- Web-aware RAG (хождение в сеть) — не в v0.8, груминг в `docs/adr/ADR-008-web-rag.md`.
- Calendar / meeting autostart — Phase 2.

## Разработка

См. [CONTRIBUTING.md](CONTRIBUTING.md) — Rider setup, тесты, lefthook, конвенции.

## Документация

- `docs/README.md` — устройство и pipeline
- `docs/adr/README.md` — активные ADR
- `CLAUDE.md` / `backend/CLAUDE.md` / `frontend/CLAUDE.md` / `python-sidecar/CLAUDE.md` — гиды для AI-агентов
- `TODO.md` — актуальный backlog (v0.8 shipped + Phase 2)
- `plan/v0.8/` — план релиза v0.8 поблочно
- `.archive/` — исторические материалы ранних итераций (агентами не читаются)

## Лицензия

MIT — см. [LICENSE](LICENSE).
