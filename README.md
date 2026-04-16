# Mozgoslav

Локальный second brain для разговоров и созвонов. Аудио → очистка → транскрибация → коррекция → суммаризация → structured markdown → Obsidian.

Desktop-приложение для macOS Apple Silicon. Всё локально, privacy-first.

## Состав

```
mozgoslav/
├── backend/           C# / ASP.NET Minimal API — доменная модель, pipeline, SQLite
├── frontend/          Electron + React + TypeScript + Redux + Saga
├── python-sidecar/    FastAPI — ML эндпоинты (diarize / NER / emotion) — V3
└── docs/
    ├── README.md              ← как это работает
    └── original-idea/         ← исходные спеки по которым писалось
```

## Требования

| Компонент | Версия | Где |
|---|---|---|
| macOS | 14+ (Apple Silicon) | — |
| .NET SDK | 9.0+ | https://dotnet.microsoft.com/download |
| Node.js | 20+ (лучше 24) | https://nodejs.org |
| Python | 3.11+ | https://python.org |
| JetBrains Rider | любая актуальная | https://jetbrains.com/rider |
| ffmpeg | любая | `brew install ffmpeg` |

Для полноценной работы — опционально:
- Whisper-модель `ggml-large-v3-q8_0.bin` (~1.5 GB). Кладётся в `~/Library/Application Support/Mozgoslav/models/`
- LM Studio или Ollama на `localhost:1234` / `localhost:11434`
- Obsidian vault

## Сборка и запуск (быстро)

### Backend (C#)

```bash
cd backend
dotnet restore
dotnet build
dotnet run --project src/Mozgoslav.Api
# → http://localhost:5050/api/health
```

В Rider: открой `backend/Mozgoslav.sln`, запусти профиль `Mozgoslav.Api`.

### Frontend (Electron)

```bash
cd frontend
npm install
npm run dev
# → Electron окно открывается, подключается к бэкенду
```

### Python sidecar (опционально, V3)

```bash
cd python-sidecar
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 5060 --reload
# → http://localhost:5060/health
```

## Порядок запуска всего

1. **LM Studio / Ollama** — загрузить модель (Qwen2.5-14B-Instruct рекомендуется).
2. **Backend** — `dotnet run` в `backend/`.
3. **Frontend** — `npm run dev` в `frontend/`.
4. **Python sidecar** — по желанию, для V3-фич.

## Статус / ограничения

Это первая итерация — скелет трёх частей. Что работает, а что помечено как TODO — см. `TODO.md` в каждой подпапке.

Сборка `.dmg` через `electron-builder --mac`, запуск Whisper.net CoreML и реальная транскрипция — требуют macOS и не проверяются в CI / Linux-среде.

## Документация

- `docs/README.md` — как это устроено
- `docs/original-idea/ADR-001-meetily-fork-architecture.md` — видение и архитектура
- `docs/original-idea/BACKEND-SPEC.md` — спека бэкенда
- `docs/original-idea/FRONTEND-SPEC.md` — спека фронтенда
- `docs/original-idea/PYTHON-SIDECAR-SPEC.md` — спека python sidecar
- `docs/original-idea/DEFAULT-CONFIG.md` — дефолтные версии и настройки
- `docs/original-idea/CLAUDE-IMPLEMENTATION-GUIDE.md` — порядок реализации
- `docs/original-idea/SPIKE-CHECKLIST.md` — pre-implementation проверки
