# Mozgoslav

Локальный second brain для разговоров и созвонов. Аудио → очистка → транскрибация → коррекция → суммаризация → structured markdown → Obsidian.

Desktop-приложение для macOS Apple Silicon. Всё локально, privacy-first. Ничего не уходит наружу, кроме запросов к LLM-endpoint, который ты сам указал в настройках.

## Состав

```
mozgoslav/
├── backend/           C# 14 / .NET 10 ASP.NET Minimal API — EF Core, Whisper.net, OpenAI SDK, Serilog, OpenTelemetry metrics
├── frontend/          Electron + React 19 + TypeScript + Redux-Saga + styled-components + i18n (ru/en)
├── python-sidecar/    FastAPI — ML endpoints (diarize / NER / emotion / gender / cleanup) — stubs до V3
└── docs/
    └── README.md                       как устроено
```

## Требования

| Компонент | Версия | Где |
|---|---|---|
| macOS | 14+ (Apple Silicon) | — |
| .NET SDK | **10.0+** | https://dotnet.microsoft.com/download |
| Node.js | 20+ (лучше 24) | https://nodejs.org |
| Python | 3.11+ | https://python.org |
| JetBrains Rider | любая актуальная | https://jetbrains.com/rider |
| ffmpeg | любая | `brew install ffmpeg` |

## Модели

### STT / VAD (встроенный каталог в Settings → Models)

| Модель | Размер | Назначение | Источник |
|---|---|---|---|
| `ggml-large-v3-q8_0.bin` | ~1.5 GB | STT мультиязык — дефолт | huggingface.co/ggerganov/whisper.cpp |
| `ggml-large-v3-turbo-q8_0.bin` | ~0.9 GB | STT (быстрее, чуть хуже) | huggingface.co/ggerganov/whisper.cpp |
| `ggml-medium-q8_0.bin` | ~0.5 GB | STT (для слабых машин) | huggingface.co/ggerganov/whisper.cpp |
| `ggml-silero-v6.2.0.bin` | ~4 MB | VAD | huggingface.co/ggml-org/whisper-vad |

### STT — русский fine-tune (выше качество на RU, ставить руками)

Качать в `~/Library/Application Support/Mozgoslav/models/` и указать путь в **Settings → Whisper**:

| Модель | WER ru | Формат | Замечания |
|---|---|---|---|
| **`antony66/whisper-large-v3-russian`** | **6.39%** | ggml / safetensors | лучший open-source whisper-fine-tune на русском |
| `bond005/whisper-large-v3-ru-podlodka` | ~10% | ggml / safetensors | тренирован на подкастах, живая речь |
| `ai-sage/GigaAM-v3` | SOTA (−50% vs whisper-large-v3) | Conformer (NeMo) | не ggml — через отдельный inference-стек, не Whisper.net напрямую |
| `ggerganov/whisper-large-v3-q8_0` | 9.84% | ggml ✅ встроено в каталог | мультиязык, дефолт |

### LLM (внешний endpoint: LM Studio / Ollama)

Приложение не качает LLM — выбираешь в LM Studio / Ollama и указываешь endpoint в **Settings → LLM**. Для M3 36 GB на 2026-04:

| Модель | Размер (Q4_K_M) | Почему |
|---|---|---|
| **Qwen3-32B-Instruct** | ~19 GB | **топовый open-source в ~27-32B**, сильнее Gemma 3 27B по общим бенчам, отличный русский |
| Qwen3-14B-Instruct | ~9 GB | быстрый дефолт при RAM-дефиците, качество заметно выше Qwen2.5-14B |
| RuadaptQwen3-32B | ~19 GB | RU fine-tune Qwen3-32B — максимальный русский среди open-source |
| Gemma 3 27B-it | ~16 GB | 128K контекст, slightly weaker reasoning, но длинные transcript'ы в один проход |
| Qwen3-235B-A22B (MoE) | ~130 GB всего | если доступно много RAM — активных параметров 22B, отличный multilingual |
| Vikhr-Nemo-12B | ~7 GB | RU fine-tune Mistral-Nemo, лёгкий |
| GigaChat-lite (Sber) | варьируется | Russian-native MoE, коммерческий open-release |
| Claude Opus / GPT-5 | — | облако, не privacy-first — не используем |

Приложение выставляет `temperature=0.1` и `response_format=json_schema`. Всё зашито в `OpenAiCompatibleLlmService`.

Пути скачанных STT/VAD моделей сохраняются в `~/Library/Application Support/Mozgoslav/models/`.

## Быстрый старт в Rider

1. Открой `backend/Mozgoslav.sln` в Rider. Запусти профиль **Mozgoslav.Api** — бэк поднимется на http://localhost:5050.
2. В другой вкладке:
   ```bash
   cd frontend
   npm install
   npm run dev              # Electron-окно откроется автоматически
   ```
3. (опционально, V3) python-sidecar:
   ```bash
   cd python-sidecar
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements-dev.txt
   uvicorn app.main:app --host 127.0.0.1 --port 5060 --reload
   ```

## Из терминала

```bash
cd backend && dotnet run --project src/Mozgoslav.Api -maxcpucount:1
# в другой вкладке
cd frontend && npm install && npm run dev
```

Сборка `.dmg`:

```bash
cd frontend && npm run dist:mac
```

## Demo (macOS)

Double-click `scripts/demo.command` in Finder — starts backend, python-sidecar, and the Electron UI. Ctrl+C in the opened terminal window shuts everything down cleanly.

(Requires: .NET 10 SDK, Node 24, Python 3.12 with `python-sidecar/.venv` initialized.)

## Dev setup

1. Install lefthook once:
   ```bash
   # macOS
   brew install lefthook
   # Linux
   curl -sSfL https://raw.githubusercontent.com/evilmartians/lefthook/master/install.sh | sh
   ```
2. Initialize hooks in the repo:
   ```bash
   cd mozgoslav
   lefthook install
   ```

Pre-commit will auto-run `dotnet format` / `eslint --fix` / `prettier --write` / `ruff --fix + black` on staged files.

## Первая настройка

1. Запусти LM Studio / Ollama, загрузи Qwen2.5-14B-Instruct-Q4.
2. **Settings → LLM** — endpoint (`http://localhost:1234` для LM Studio), при необходимости API-key.
3. **Settings → Whisper** или **Models → Download** — скачай `ggml-large-v3-q8_0.bin` и `ggml-silero-v6.2.0.bin`.
4. **Settings → Storage** — укажи путь к Obsidian vault. Потом на странице **Obsidian** подготовь папки (`_inbox / People / Projects / Topics / Templates`) одной кнопкой.
5. Есть Meetily.app? В **Import from Meetily** укажи путь к `meeting_minutes.sqlite` — все встречи подтянутся.

## Privacy & security

- Electron: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Preload whitelistит только `openAudioFiles / openFolder / openPath`.
- Content-Security-Policy: `default-src 'self'`, `connect-src 'self' http://localhost:5050 ws://localhost:5173 http://localhost:5173`. Никаких внешних адресов.
- Kestrel слушает **только** `localhost:5050`. CORS — localhost и `app://mozgoslav`.
- Все секреты (LLM API key, Obsidian token) живут в SQLite `settings` table. Никогда не передаются никуда, кроме endpoint'а, куда явно адресованы.
- Zero telemetry. Никаких crash-reporters / analytics / auto-update checks.
- Логи — только локально в `~/Library/Application Support/Mozgoslav/logs/`. Просматривать можно прямо в UI (Logs page).
- Downloads моделей — только HuggingFace HTTPS URL из встроенного каталога (`ModelCatalog.cs`).

## Recording playback caveat

Playback through Bluetooth headphones may sound distorted — your recording is fine, it's a playback driver issue. See [docs/bluetooth-playback-notice.md](docs/bluetooth-playback-notice.md).

## Бэкапы

UI → **Backups → Create**, или `POST /api/backup/create`. Складывается zip в `~/Library/Application Support/Mozgoslav/backups/` (база + конфиг, без логов). Восстановить — распаковать в ту же папку.

## Ограничения

- `electron-builder --mac` сборка и CoreML-ускорение Whisper — только на macOS.
- Запись с микрофона — сейчас `NoopAudioRecorder` (интерфейс готов, native macOS реализация — следующая итерация).
- V3 ML (diarize / gender / emotion / NER) — только stubs в python-sidecar.
- Актуальный backlog и roadmap см. в `TODO.md`.

## Документация

- `docs/README.md` — устройство и pipeline
- `CLAUDE.md` / `backend/CLAUDE.md` / `frontend/CLAUDE.md` / `python-sidecar/CLAUDE.md` — гиды для AI-агентов
- `TODO.md` — актуальный backlog
- `.archive/` — исторические материалы ранних итераций (агентами не читаются)

## Лицензия

MIT — см. [LICENSE](LICENSE).
