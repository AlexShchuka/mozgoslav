# Инструкция для Claude: реализация Mozgoslav for Conversations

**Этот файл прочитай ПЕРВЫМ при начале новой сессии.**
**Цель:** восстановить полный контекст и приступить к реализации без лишних вопросов.

---

## Правила для Claude

1. **ТОЛЬКО реализуй.** Не предлагай альтернативы, не обсуждай архитектуру, не задавай вопросы "а может лучше X?". Всё уже решено. Спеки утверждены. Делай.
2. **ЧИТАЙ существующий код перед написанием.** Не выдумывай паттерны из головы. Бери из referенсных репозиториев (ссылки ниже).
3. **DDD + TDD.** Сначала тест, потом реализация. Domain первый, Infrastructure последний.
4. **Не добавляй фичи** которых нет в спеках. Никакого "while I'm at it". Ровно то что описано.
5. **Не меняй стек.** C# + React + Redux + styled-components + Electron. Не предлагай "а давайте на Zustand" или "может Tailwind". Решено.
6. **Итерациями.** Одна фича за раз. Проверяй что компилируется и тесты проходят перед следующей.

---

## Спецификации (читай ВСЕ перед началом)

| Файл | Что содержит |
|---|---|
| `ADR-001-meetily-fork-architecture.md` | Видение, сценарии, сущности, pipeline, roadmap, риски, решения |
| `BACKEND-SPEC.md` | C# DDD: entities, use cases, interfaces, infrastructure, API, SQL schema, code style |
| `FRONTEND-SPEC.md` | React+TS+Electron: structure, components, store (Redux+Saga), API (Axios+BaseApi), patterns |
| `PYTHON-SIDECAR-SPEC.md` | Python ML: FastAPI, diarize, gender, emotion, NER, filler, workarounds |

**Все файлы в:** `/home/coder/workspace/speech-processing/`

---

## Референсные репозитории (ОБЯЗАТЕЛЬНО изучить паттерны)

### C# Backend — паттерны DDD

Ориентир — классическая DDD-раскладка:
- `src/Domain/` — доменная модель (entities, enums, value objects), без внешних зависимостей
- `src/Application/` — use cases, command handlers, интерфейсы инфраструктуры
- `src/Infrastructure/` — реализации (SQLite, ffmpeg, Whisper.net, LLM клиент)
- `src/Api/` — ASP.NET Minimal API (endpoints, DI wiring, startup)
- `tests/Mozgoslav.Tests/` — unit tests (xUnit)
- `tests/Mozgoslav.Tests.Integration/` — integration tests
- `Directory.Build.props`, `Directory.Packages.props` — централизованный project/package config

### React Frontend — паттерны компонентов

Ориентир — feature-based структура с Redux + Saga:
- `src/features/` — feature-based component structure (Component.tsx + .style.ts + .container.ts + types.ts)
- `src/store/` — Redux pattern (actionCreator → reducer → mutations → selectors → saga)
- `src/api/` — Axios BaseApi + ApiFactory + per-entity API classes
- `src/models/` — доменные типы (TypeScript interfaces)
- `src/core/` — бизнес-логика без UI (utils, navigation, validation)
- `src/components/` — shared UI components
- `src/hooks/` — global hooks
- `plop-templates/` — generators для features и store slices
- Container/Presentational pattern через connect()
- styled-components для стилей
- Jest + redux-saga-test-plan для тестов

### Meetily (референс, не форк)

**Репо:** `https://github.com/Zackriya-Solutions/meeting-minutes`
**Что брать:** идеи UI/UX, SQLite schema, audio pipeline концепция. НЕ копировать код (другой стек — Rust/Tauri).

### Консольный MVP (рабочий прототип)

**Референс pipeline:** локальный bash+Python скрипт с whisper-cli → diarize → gender → emotion → NER → filler → .md
**Что содержит:** bash + Python heredoc, полный pipeline (whisper-cli → diarize → gender → emotion → NER → filler → .md)
**Что брать:** проверенные параметры whisper, filler-словарь, emotion label mapping, merge logic, markdown format, known workarounds

---

## Что уже решено (НЕ обсуждать)

| Решение | Финальный выбор |
|---|---|
| Desktop shell | Electron |
| Backend язык | C# / ASP.NET Minimal API / .NET 9 |
| Frontend framework | React 18 + TypeScript strict |
| State management | Redux + Redux-Saga (как в reference React+Redux+Saga project) |
| Styling | styled-components (как в reference React+Redux+Saga project) |
| HTTP client | Axios + BaseApi + ApiFactory (как в reference React+Redux+Saga project) |
| Component pattern | Container/Presentational + connect() |
| ORM | Dapper + Microsoft.Data.Sqlite (не EF Core) |
| STT | Whisper.net (NuGet, CoreML) |
| LLM | OpenAI SDK → LM Studio / Ollama (localhost HTTP) |
| ML sidecar | Python + FastAPI (localhost:5060) |
| Diarization | Silero VAD + Resemblyzer + sklearn (не pyannote — gated) |
| Gender | audeering/wav2vec2-large-robust-24-ft-age-gender |
| Emotion | audeering/wav2vec2-large-robust-12-ft-emotion-msp-dim |
| NER | Natasha (русский) |
| Tests (C#) | xUnit + NSubstitute |
| Tests (Frontend) | Jest + React Testing Library + redux-saga-test-plan |
| Tests (Python) | pytest |
| Build | electron-builder → .dmg (macOS arm64) |
| Whisper params | beam=5, bestOf=5, maxContext=0, suppressNst=true, VAD=Silero, prompt="Мысли вслух, встречи, диалоги, рассуждения." |
| Whisper model | ggml-large-v3-q8_0.bin |
| LLM model | Qwen3.5-27B (local) или любая через OpenAI-compatible API |

---

## Порядок реализации (итерации)

### Итерация 0: Scaffolding
1. Создать `Mozgoslav.sln` с проектами: Domain, Application, Infrastructure, Api, Tests
2. Создать `frontend/` с electron-vite + React + TypeScript + Redux + styled-components
3. Electron main process: создание окна + запуск C# backend
4. Проверить: `dotnet run` + `npm run dev` → окно открывается, API отвечает на /health
5. `electron-builder --mac` → .dmg файл
6. Всё коммитить.

### Итерация 1: Domain + Storage
1. Domain entities: Recording, Transcript, ProcessedNote, Profile, ProcessingJob (по BACKEND-SPEC.md §3)
2. Value objects: TranscriptSegment, ActionItem (по BACKEND-SPEC.md §3.2)
3. Enums: AudioFormat, SourceType, RecordingStatus, JobStatus, ConversationType, CleanupLevel
4. Domain services: FillerCleaner, HashCalculator, AudioFormatDetector
5. SQLite schema: create tables (по BACKEND-SPEC.md §5.4)
6. Repositories: SqliteRecordingRepository, SqliteTranscriptRepository, etc.
7. Seed data: 3 built-in profiles (по BACKEND-SPEC.md §5.5)
8. Unit tests на domain services + repository integration tests с in-memory SQLite

### Итерация 2: Audio Import + Transcription
1. IAudioConverter (ffmpeg subprocess) + ITranscriptionService (Whisper.net)
2. ImportRecordingUseCase: import файлов → Recording в БД → Job в очередь
3. ProcessQueueWorker: convert → transcribe → save Transcript
4. API endpoints: POST /api/recordings/import, GET /api/recordings, GET /api/jobs
5. SSE: GET /api/jobs/stream для прогресса
6. Tests: ImportRecordingUseCase с mocked repos, WhisperService smoke test

### Итерация 3: LLM Summarization + Export
1. ILlmService (OpenAI SDK → LM Studio)
2. Expand ProcessQueueWorker: cleanup → summarize → create ProcessedNote → generate markdown
3. IMarkdownExporter: write .md to vault folder
4. API: GET /api/notes/{id}, POST /api/notes/{id}/export
5. Profiles: GET /api/profiles, POST /api/profiles
6. ReprocessUseCase: тот же transcript, другой profile → новый ProcessedNote
7. Tests: LLM mock, markdown generation, reprocess

### Итерация 4: Frontend — Dashboard + Queue
1. Layout: Sidebar + Content (styled-components, по FRONTEND-SPEC.md §3.1)
2. Store slices: recording, job, ui (по FRONTEND-SPEC.md §3.2)
3. API layer: BaseApi, ApiFactory, RecordingApi, JobApi (по FRONTEND-SPEC.md §3.3)
4. Dashboard: RecordingList, ImportDropzone (drag-and-drop)
5. Queue: JobQueue с real-time прогрессом через SSE saga (по FRONTEND-SPEC.md §3.4)
6. Tests: компоненты + sagas

### Итерация 5: Frontend — Note Viewer + Settings
1. Store slices: note, profile, settings
2. NoteViewer: markdown rendering, actions (reprocess, export)
3. ProfilePicker: выбор профиля при импорте и reprocess
4. Settings: vault path, LLM endpoint, whisper model
5. Tests

### Итерация 6: Audio Recording
1. IAudioRecorder: start/stop запись через NAudio / system mic
2. RecordButton в Dashboard
3. Индикация записи (длительность, пульсация)
4. После stop → автоимпорт в очередь

### Итерация 7: Python Sidecar (V3 features)
1. FastAPI app (по PYTHON-SIDECAR-SPEC.md)
2. /api/diarize, /api/gender, /api/emotion, /api/ner, /api/cleanup
3. C# PythonSidecarClient
4. Expand ProcessQueueWorker: вызов sidecar если доступен
5. Expand ProcessedNote и markdown: спикеры, пол, эмоция, NER в frontmatter
6. Tests: Python pytest + C# integration с mock HTTP

### Итерация 8: Polish
1. Drag-and-drop batch import
2. Profile editor (CRUD custom profiles)
3. Error handling UI (toast notifications)
4. Obsidian REST API integration (вместо file I/O)
5. electron-builder: иконки, автообновление

---

## Структура проекта (финальная)

```
mozgoslav/
├── backend/                         ← C# solution
│   ├── src/
│   │   ├── Mozgoslav.Domain/
│   │   ├── Mozgoslav.Application/
│   │   ├── Mozgoslav.Infrastructure/
│   │   └── Mozgoslav.Api/
│   ├── tests/
│   │   ├── Mozgoslav.Tests/
│   │   └── Mozgoslav.Tests.Integration/
│   └── Mozgoslav.sln
│
├── frontend/                        ← Electron + React
│   ├── electron/
│   ├── src/
│   │   ├── api/
│   │   ├── models/
│   │   ├── core/
│   │   ├── store/
│   │   ├── features/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── constants/
│   ├── plop-templates/
│   └── package.json
│
├── python-sidecar/                  ← Python ML (V3)
│   ├── app/
│   ├── tests/
│   └── requirements.txt
│
├── docs/
│   ├── ADR-001-meetily-fork-architecture.md
│   ├── BACKEND-SPEC.md
│   ├── FRONTEND-SPEC.md
│   ├── PYTHON-SIDECAR-SPEC.md
│   └── CLAUDE-IMPLEMENTATION-GUIDE.md  ← этот файл
│
└── README.md
```

---

## Что обсуждали и ОТВЕРГЛИ (не предлагай снова)

| Идея | Почему отвергли |
|---|---|
| **pyannote speaker-diarization** (любая версия) | Все модели gated на HuggingFace. User принципиально не хочет HF-аккаунт. Выбран Resemblyzer. |
| **Audio-LLM refine (Qwen2.5-Omni)** | Тяжёлая модель, сложная интеграция. User решил: пост-обработку текста делает **Templater (split_and_label.js)** внутри Obsidian через LLM — не наше приложение. |
| **Text-only LLM refine в приложении** | Тоже убрали — Templater в Obsidian уже это делает. Не дублируем. |
| **Tauri** вместо Electron | Tauri = Rust. Команда не знает Rust. |
| **Rust backend** | Команда C#-разработчики. |
| **Zustand** вместо Redux | В reference React+Redux+Saga project используют Redux+Saga. Не меняем стек. |
| **Tailwind** вместо styled-components | В reference React+Redux+Saga project используют styled-components. Не меняем. |
| **TanStack Query** вместо Axios+Saga | Не паттерн команды. |
| **EF Core** вместо Dapper | Overkill для desktop app с SQLite. |
| **Микросервисы** | Всё локально, один бинарник C# + один Python sidecar. |

## Ключевые обсуждения сессии (контекст для решений)

### LLM для pipeline
Сравнивали **Qwen3.5-27B** (local, M3 36GB) vs **GPT-5.4** (BotHub, облако). Вердикт: **Qwen локально** — privacy-first, бесплатно, достаточно для correction+summary. GPT-5.4 — только для разового глубокого анализа, не для daily pipeline. LM Studio на localhost:1234 — уже настроен.

### Obsidian Copilot
После того как pipeline кладёт .md в vault — пользователь ищет по заметкам через **Obsidian Copilot** (плагин). Copilot использует **Ollama** (localhost) + **RAG** по vault. Индексирует все заметки, позволяет спрашивать "что обсуждали с Алексеем за месяц?". Это **не наше приложение** — мы только генерируем .md, Copilot работает поверх.

### Meetily SQLite Sync
Meetily.app (desktop, Zackriya) хранит встречи в SQLite (`meeting_minutes.sqlite`). В desktop-приложении должно быть отдельной кнопкой "Import from Meetily" — читает SQLite, конвертирует в формат Recording.

### Whisper модели — альтернативы
Обсуждали: T-one (Т-банк, лучший WER на русском), GigaAM v2/v3 (Сбер), whisper-podlodka-turbo (bond005, fine-tuned на русском). Вердикт: начинаем на **ggml-large-v3-q8_0**, мигрируем если качество не устроит. В V2 можно добавить UI для выбора модели.

### PARA
Tiago Forte's PARA (Projects/Areas/Resources/Archive) — выбран как основа vault structure. Но маршрутизация по папкам — **V2**, не MVP. MVP кладёт всё в `_inbox/`, пользователь сам разносит или через Templater.

## Целевая среда

- **ОС:** macOS Apple Silicon (M3/M4), 36 GB RAM
- **Стек разработчиков:** C# / TypeScript
- **IDE:** JetBrains Rider + VS Code
