# ADR-001: Mozgoslav for Conversations — Architecture & Decisions

**Статус:** Draft
**Дата:** 2026-04-16
**Авторы:** user + команда
**Контекст:** продуктовая сессия 2026-04-16

---

## 1. Видение

Внутреннее desktop-приложение для macOS — **локальный second brain для разговоров и созвонов команды**.

Не диктофон. Не транскрибатор. Инструмент, который **превращает аудио в знания**.

**Pipeline:**
```
аудио → очистка → транскрибация → коррекция → суммаризация → structured markdown → Obsidian → поиск и повторное использование
```

**Суть в одном абзаце:**
Локально записывает или принимает разговоры, прогоняет через очистку, транскрибацию, контекстную коррекцию и суммаризацию, превращает результат в структурированные заметки и складывает в Obsidian так, чтобы история созвонов стала searchable second brain. Базовый консольный pipeline уже есть. Задача — собрать поверх него удобный UI, стабильный MVP и определить, что переписывать, а что обернуть.

---

## 2. Зачем

- История разговоров как внутренняя память команды
- Быстро возвращаться к договорённостям, решениям, задачам, контексту
- Искать по старым разговорам: знания, темы, людей, проекты
- Получать не raw transcript, а summary, key points, decisions, action items, follow-up, связи
- Searchable second brain, а не кладбище заметок

---

## 3. Основной сценарий

```
[1] Записать разговор в приложении (start/stop)
    или загрузить готовые аудио (mp3/m4a/wav, drag-and-drop, batch)
        ↓
[2] Очередь обработки (с индикацией статуса)
        ↓
[3] Локальная обработка аудио (ffmpeg → 16kHz mono WAV)
        ↓
[4] Локальная транскрибация (whisper, выбор модели)
        ↓
[5] Контекстная коррекция (исправление терминов, имён, аббревиатур)
        ↓
[6] Semantic processing через локальную LLM (summary, topics, decisions, action items, ...)
        ↓
[7] Формирование структурированной заметки (markdown + frontmatter)
        ↓
[8] Экспорт в Obsidian (файл + wiki-links + теги + правильная папка)
        ↓
[9] Поиск и повторное использование (Obsidian Copilot, локальные модели)
```

---

## 4. Ключевая идея: source ≠ output

**Одна запись может иметь несколько смысловых интерпретаций.**

```
Recording (source, immutable)
  ├── [Profile: рабочий]      → Processed Note A (протокол, задачи, решения)
  ├── [Profile: неформальный]  → Processed Note B (контекст, шутки, атмосфера)
  ├── [Profile: 1:1]          → Processed Note C (личные договорённости)
  └── [Profile: кастомный]     → Processed Note D (по пользовательскому промпту)
```

Пример: запись 1:1 с коллегой. Сначала прогнали как рабочий протокол. Через неделю — как дружеский разговор. Source один, outputs — несколько. Каждый со своим summary, action items, тегами.

---

## 5. Профили / режимы обработки

| Профиль | Что делает | Что выкидывает |
|---|---|---|
| **Рабочий** | Задачи, решения, участники, зависимости, дедлайны | Small talk, шутки, болтовню |
| **Неформальный** | Общий смысл, контекст, шутки как шутки | Ничего — сохраняет всё, но не делает сухой протокол |
| **1:1** | Личные договорённости, feedback, карьерные вопросы | Общие темы команды |
| **Свободная заметка** | Ключевые мысли, идеи, инсайты | Структурирование минимальное |
| **Полная заметка** | Всё: full transcript + summary + entities | Ничего |
| **Кастомный** | Пользовательский prompt / шаблон | Определяется промптом |

Каждый профиль = набор:
- system prompt для LLM (что извлекать, что игнорировать)
- output template (структура .md)
- cleanup rules (filler removal level)
- export rules (куда в vault, какие теги)

---

## 6. Что приложение должно уметь (функциональные требования)

### Запись и импорт
- [ ] Запись аудио по кнопке start/stop
- [ ] Индикация записи, длительности
- [ ] Импорт mp3 / m4a / wav / mp4 / ogg / flac
- [ ] Drag-and-drop
- [ ] Пакетная загрузка (выбрать папку)

### Обработка
- [ ] Очередь обработки (queue) с UI: статус каждого файла
- [ ] Выбор модели транскрибации (whisper large-v3, turbo, etc.)
- [ ] Выбор модели LLM (Ollama, LM Studio, local)
- [ ] Запуск локальной транскрибации
- [ ] Контекстная коррекция (термины, имена, аббревиатуры)
- [ ] Запуск локальной суммаризации через LLM
- [ ] Повторный прогон записи через другой профиль
- [ ] Настраиваемые профили обработки

### Экспорт
- [ ] Экспорт в Obsidian (markdown + frontmatter)
- [ ] Настройка пути к vault
- [ ] Настройка папки экспорта
- [ ] Wiki-links и связи между заметками
- [ ] Гибкая маршрутизация по папкам
- [ ] Настраиваемый формат frontmatter, теги, links

### Настройки
- [ ] Пути к моделям
- [ ] Пути к Obsidian vault
- [ ] Профили обработки (CRUD)
- [ ] Словарь пользовательских терминов (V2)
- [ ] Folder mapping rules (V2)

---

## 7. Выходной формат

### На каждый разговор — отдельная заметка:

```markdown
---
type: conversation
profile: work
date: 2026-04-16
duration: "00:42:15"
participants: [Иван, Ольга, Сергей]
topic: "Планирование Q2"
conversation_type: meeting
tags: [meeting, planning, Q2]
source_audio: "recording-2026-04-16.m4a"
processing_version: 1
---

## Summary
Обсудили приоритеты Q2. Решили фокусироваться на автоматизации отчётности.

## Ключевые тезисы
- Автоматизация отчётности — приоритет №1
- Дедлайн MVP — 15 мая
- Нужен ресёрч по интеграции с BI

## Решения
- [ ] Иван берёт на себя MVP отчётности
- [ ] Ольга готовит спеку по BI до пятницы
- [ ] Следующий sync — вторник 10:00

## Вопросы без ответа
- Кто будет ревьюить архитектуру?
- Бюджет на внешние API не согласован

## Action Items
- Иван: MVP отчётности (дедлайн 15 мая)
- Ольга: спека BI (дедлайн пятница)
- Сергей: забронировать sync на вторник

## Участники
- [[Иван]] — tech lead
- [[Ольга]] — аналитик
- [[Сергей]] — PM

## Clean Transcript
(очищенный от filler'ов, исправленный)

## Full Transcript
(raw, как распознал whisper)
```

### Агрегированные заметки (V2-V3):
- **По людям:** `[[Иван]].md` — все разговоры, решения, action items
- **По темам:** `[[Q2 Planning]].md` — все обсуждения темы
- **По проектам:** `[[Автоматизация отчётности]].md` — контекст проекта из разговоров

---

## 8. Ключевые сущности (data model)

```
Recording (source, immutable)
├── id (UUID)
├── audio_path
├── sha256
├── duration
├── created_at
├── format (mp3/m4a/wav)
└── source_type (recorded / imported)

Transcript
├── id
├── recording_id (FK)
├── model_used (ggml-large-v3-q8_0)
├── language
├── raw_text
├── segments[] (start, end, text)
├── created_at
└── whisper_params (JSON: beam_size, prompt, etc.)

ProcessedNote
├── id
├── recording_id (FK)
├── transcript_id (FK)
├── profile_id (FK)
├── version (int, для повторных прогонов)
├── summary
├── key_points[]
├── decisions[]
├── action_items[]
├── unresolved_questions[]
├── participants[]
├── topic
├── conversation_type
├── clean_transcript
├── tags[]
├── markdown_content
├── exported_to_vault (bool)
├── vault_path
├── created_at
└── llm_used (model name)

Person
├── id
├── name
├── aliases[]
├── notes
└── linked_recordings[]

Topic / Project
├── id
├── name
├── description
└── linked_recordings[]

Profile
├── id
├── name (work / personal / 1:1 / custom)
├── system_prompt (для LLM)
├── output_template (структура .md)
├── cleanup_level (none / light / aggressive)
├── export_folder
├── tags_template
├── frontmatter_template
└── is_default (bool)

ProcessingJob
├── id
├── recording_id (FK)
├── profile_id (FK)
├── status (queued / transcribing / correcting / summarizing / exporting / done / failed)
├── progress (0-100)
├── error_message
├── created_at
├── started_at
├── finished_at
└── duration_ms

VaultExportRule
├── id
├── profile_id (FK) или global
├── folder_pattern (e.g. "00 Inbox/raw/{date}/")
├── filename_pattern (e.g. "{date}-{topic}")
├── frontmatter_fields[]
├── auto_tags[]
└── auto_links[]

FolderMapping
├── id
├── conversation_type → folder
├── configurable by user
└── supports PARA or custom structure
```

---

## 9. Архитектура

### Компоненты

```
┌──────────────────────────────────────────────────────────────┐
│                        Electron App                           │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              React UI (TypeScript / Vite)             │    │
│  │                                                       │    │
│  │  ┌───────────┐ ┌──────────┐ ┌────────────┐          │    │
│  │  │ Recorder  │ │ Queue /  │ │ Note       │          │    │
│  │  │ + Import  │ │ Status   │ │ Viewer     │          │    │
│  │  └───────────┘ └──────────┘ └────────────┘          │    │
│  │  ┌───────────┐ ┌──────────┐ ┌────────────┐          │    │
│  │  │ Settings  │ │ Profiles │ │ Obsidian   │          │    │
│  │  │           │ │ Editor   │ │ Export     │          │    │
│  │  └───────────┘ └──────────┘ └────────────┘          │    │
│  └────────────────────┬─────────────────────────────────┘    │
│                       │ HTTP (localhost:5050)                  │
│  ┌────────────────────▼─────────────────────────────────┐    │
│  │              C# Backend (ASP.NET Minimal API)         │    │
│  │                                                       │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │    │
│  │  │ AudioService│  │ WhisperSvc   │  │ QueueSvc   │  │    │
│  │  │ (record,    │  │ (Whisper.net) │  │ (jobs,     │  │    │
│  │  │  convert,   │  │              │  │  progress) │  │    │
│  │  │  import)    │  │              │  │            │  │    │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │    │
│  │  │ CorrectionSvc│ │ LLMClient   │  │ ObsidianSvc│  │    │
│  │  │ (terms,     │  │ (Ollama /   │  │ (REST API /│  │    │
│  │  │  names,     │  │  LM Studio) │  │  file exp.)│  │    │
│  │  │  glossary)  │  │              │  │            │  │    │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │    │
│  │  │ ProfileSvc  │  │ StorageSvc   │  │ ExportSvc  │  │    │
│  │  │ (CRUD,      │  │ (SQLite)     │  │ (markdown, │  │    │
│  │  │  templates) │  │              │  │  vault)    │  │    │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │    │
│  └────────────────────┬─────────────────────────────────┘    │
│                       │ HTTP (localhost:5060)                  │
│  ┌────────────────────▼─────────────────────────────────┐    │
│  │              Python ML Sidecar (V3)                   │    │
│  │  Diarization, Gender, Emotion, NER                    │    │
│  │  (подключается в V3, не MVP)                          │    │
│  └───────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Решение: Wrap vs Rewrite

**Для MVP — wrap.** Существующий консольный pipeline (process.command + Python) уже работает. Не переписываем его, а оборачиваем:

```
C# Backend
  ├── WhisperService    → вызывает whisper-cli (как subprocess)
  ├── CorrectionService → вызывает Python sidecar (существующий)
  ├── LLMClient         → HTTP к Ollama/LM Studio (уже запущен)
  └── ExportService     → пишет .md файлы напрямую
```

**Для V2+ — постепенный rewrite:** горячие пути (whisper, correction) переезжают на Whisper.net / нативный C#. Python sidecar остаётся для ML-тяжёлых задач.

**Обоснование:** главный риск — «Claude всё перепишет, потом ничего не стартует, и начнётся долгий дебаг». Wrap-подход минимизирует этот риск: ядро не трогаем, UI строим поверх. Rewrite — только когда понятно зачем и есть тесты.

---

## 10. Pipeline обработки (детально)

### Этап 1: Audio Input
```
C# AudioService:
  - Запись через системный mic API (NAudio / PortAudio binding)
  - Или импорт файла (drag-drop / file picker / batch folder)
  - Конверсия → 16kHz mono WAV (через ffmpeg subprocess)
  - Сохранение Recording в SQLite
  - Постановка в очередь (ProcessingJob: status=queued)
```

### Этап 2: Transcription
```
C# WhisperService:
  MVP: subprocess → whisper-cli с параметрами
  V2+: Whisper.net (C# binding, CoreML/Metal)

  Модель: ggml-large-v3-q8_0.bin (дефолт, пользователь может сменить)
  Параметры: beam_size=5, best_of=5, max_context=0, suppress_nst=true
  VAD: Silero v6.2.0 (ggml binary)
  Prompt: из Profile.system_prompt или дефолтный
  Выход: segments[] (start, end, text) → Transcript в SQLite
```

### Этап 3: Correction
```
C# CorrectionService:
  1. Filler cleanup (regex): "ну", "типа", "эээ", дубликаты
  2. Term correction через glossary:
     - Глобальный словарь: PostgreSQL, Kubernetes, GitLab, MR, ...
     - Пользовательский словарь: имена коллег, названия проектов, аббревиатуры
  3. Опционально: LLM-коррекция (prompt: "исправь ошибки STT, не меняй смысл")

  Выход: clean_transcript
```

### Этап 4: Semantic Processing (LLM)
```
C# LLMClient → HTTP к Ollama (localhost:11434) или LM Studio (localhost:1234):

  Вход: clean_transcript + Profile.system_prompt
  
  System prompt (пример для рабочего профиля):
  """
  Ты ассистент для обработки записей рабочих встреч.
  На входе — расшифровка разговора.
  Верни JSON:
  {
    "summary": "краткое изложение (3-5 предложений)",
    "key_points": ["тезис 1", "тезис 2"],
    "decisions": ["решение 1", "решение 2"],
    "action_items": [{"person": "Имя", "task": "Что", "deadline": "Когда"}],
    "unresolved_questions": ["вопрос 1"],
    "participants": ["Имя 1", "Имя 2"],
    "topic": "тема разговора",
    "conversation_type": "meeting|1:1|idea|other",
    "tags": ["tag1", "tag2"]
  }
  """
  
  Выход: structured JSON → ProcessedNote в SQLite
```

### Этап 5: Markdown Generation
```
C# ExportService:
  Вход: ProcessedNote + Profile.output_template
  
  Логика:
  1. Собрать frontmatter из ProcessedNote полей
  2. Собрать body по шаблону профиля
  3. Подставить wiki-links: участники → [[Имя]], темы → [[Тема]]
  4. Добавить теги из профиля + из LLM
  5. Записать .md файл
  
  Выход: файл в vault по VaultExportRule
```

### Этап 6: Obsidian Export
```
C# ObsidianService:
  Вариант A (MVP): прямая запись .md файла в папку vault
  Вариант B (V2): REST API → Local REST API plugin → можно открыть заметку
  Вариант C (V2): REST API → Templater → дообработка внутри Obsidian
  
  Папка определяется:
  1. Profile.export_folder (дефолт)
  2. FolderMapping по conversation_type
  3. VaultExportRule паттерны
  
  Имя файла: VaultExportRule.filename_pattern → "{date}-{topic}.md"
```

---

## 11. Обработка длинных записей

Whisper работает окнами по 30 секунд. Запись на 2 часа = ~240 окон.

**Стратегия:**
1. Whisper обрабатывает как обычно (streaming по окнам) → ~5-15 мин на час аудио (Apple Silicon)
2. LLM-суммаризация: если transcript > context window LLM (8K-32K токенов) → chunk by segments, summarize chunks, merge summaries
3. UI показывает прогресс по этапам: transcription 45% → correction → summarization 20%
4. Промежуточные результаты сохраняются в SQLite (crash-safe: если упадёт, не начинаем с нуля)

---

## 12. Технологический стек

| Компонент | Технология | Почему |
|---|---|---|
| Desktop shell | **Electron** | Команда знает TypeScript; зрелая экосистема |
| UI | **React + TypeScript + Vite** | Знакомый стек; компоненты Meetily как референс |
| Backend | **C# / ASP.NET Minimal API** | Основной язык команды |
| STT | **whisper-cli** (MVP) → **Whisper.net** (V2+) | CLI wrap для скорости, нативный C# потом |
| LLM | **Ollama** / **LM Studio** (HTTP API) | Уже работает; OpenAI-compatible; пользователь выбирает модель |
| Audio | **ffmpeg** (subprocess) | Универсальный конвертер |
| Storage | **SQLite** (Microsoft.Data.Sqlite) | Как в Meetily; лёгкий; один файл |
| ML (V3) | **Python sidecar** (diarize, NER, emotion) | Модели доступны только на Python |
| Export | **File I/O** (MVP) → **Obsidian REST API** (V2) | Просто; надёжно |
| Build | **electron-builder** → .dmg | Стандарт |

### Модели (RAM бюджет ~10-15 GB)

| Модель | Назначение | Размер | Когда |
|---|---|---|---|
| ggml-large-v3-q8_0 | STT | ~1.5 GB | MVP |
| Silero VAD v6.2.0 | VAD | ~4 MB | MVP |
| Qwen2.5-14B-Q4 | LLM (correction + summary) | ~9 GB | MVP |
| Resemblyzer | Diarization embeddings | ~25 MB | V3 |
| audeering age-gender | Пол спикера | ~1.3 GB | V3 |
| audeering emotion-dim | Эмоция | ~1.3 GB | V3 |
| Natasha | NER русский | ~300 MB | V3 |

---

## 13. Что берём из Meetily / существующего pipeline

### Из Meetily (референс)
- UI компоненты и UX паттерны (React)
- SQLite-схема встреч (совместимость)
- Идея audio pipeline (6-stage preprocessing)
- Модель whisper (ggml-large-v3-q8_0.bin) — тот же файл

### Из консольного MVP (bash + Python)
- **Whisper параметры** (beam_size=5, best_of=5, max_context=0, suppress_nst, VAD, prompt) — проверены в бою
- **Filler cleanup** (regex + словарь) — работает
- **Diarization pipeline** (Silero VAD + Resemblyzer + sklearn) — V3
- **Gender / Emotion** (audeering) — V3
- **NER** (Natasha) — V3
- **Markdown формат** (frontmatter + body) — адаптируем под шаблоны
- **Идемпотентность** (sha256 registry) — переносим в SQLite
- **Meetily SQLite sync** (meetily-to-obsidian.sh) — как отдельный импорт

---

## 14. Что НЕ делаем

| Что | Почему |
|---|---|
| Облачные API | Всё локально, privacy-first |
| Rust backend | Команда не знает Rust |
| Tauri | Зависимость от Rust |
| Live transcription (MVP) | Сложно; batch-first |
| Идеальный UX (MVP) | Функциональность > полировка |
| Автоматизация всего (MVP) | Ручной контроль > магия |
| Многопользовательность | Однопользовательский desktop app |
| Diarization (MVP) | V3 — сложная ML-задача |

---

## 15. Roadmap

### MVP (4-6 недель)

**Цель:** минимальный рабочий продукт, который заменяет консольный pipeline.

- [ ] Electron + React + C# scaffold, сборка .dmg
- [ ] Запись аудио (start/stop), импорт файлов, drag-and-drop
- [ ] Очередь обработки с UI (статус, прогресс)
- [ ] Транскрибация (whisper-cli subprocess)
- [ ] Filler cleanup (regex)
- [ ] LLM summarization (Ollama/LM Studio HTTP)
- [ ] 2-3 встроенных профиля (рабочий, неформальный, полный)
- [ ] Markdown export в Obsidian (file I/O, настраиваемая папка)
- [ ] Базовый frontmatter (date, topic, type, tags, participants)
- [ ] Повторный прогон записи другим профилем
- [ ] SQLite хранение всего
- [ ] Скачивание/выбор моделей (whisper, LLM)
- [ ] Базовая классификация: work / personal / idea / other

**Не в MVP:** diarization, NER, emotion, gender, агрегированные заметки, PARA routing, custom glossary.

### V2 (после MVP)

- [ ] Пакетная обработка с прогресс-баром
- [ ] Пользовательские профили (CRUD, custom prompts)
- [ ] Словарь терминов (glossary для коррекции)
- [ ] Контекстная LLM-коррекция (отдельный этап)
- [ ] Агрегированные заметки по людям
- [ ] Агрегированные заметки по темам/проектам
- [ ] PARA routing (настраиваемый folder mapping)
- [ ] Obsidian REST API интеграция
- [ ] Obsidian wiki-links ([[Person]], [[Topic]])
- [ ] Whisper.net (нативный C# вместо CLI subprocess)
- [ ] Профили очистки (light / aggressive / custom)
- [ ] Обновление существующих summary-заметок

### V3 (long-term)

- [ ] Diarization (Resemblyzer или pyannote)
- [ ] Speaker identification (база голосов)
- [ ] Gender / Emotion detection
- [ ] NER (Natasha)
- [ ] Автосвязывание с существующими заметками Obsidian
- [ ] Monthly summaries
- [ ] Запросы: «что обсуждали с Алексеем за месяц?», «какие action items повторяются?»
- [ ] Live transcription

---

## 16. Риски

| Риск | Вероятность | Влияние | Митигация |
|---|---|---|---|
| **Переписывание Rust→C# через LLM → дебаг мелких ошибок** | Высокая | Высокое | **Wrap, не rewrite.** MVP использует subprocess'ы. Нативный C# — только по необходимости, с тестами. |
| **Интеграции, зависимости, async, edge cases** | Высокая | Среднее | Поэтапный подход. Каждый этап pipeline — отдельный сервис, тестируемый изолированно. |
| **Python sidecar тяжёлый (2-3 GB)** | Средняя | Среднее | В MVP Python не нужен (diarization = V3). Потом — embedded Python или отдельная установка. |
| **LLM-суммаризация нестабильна (JSON parsing fails)** | Средняя | Среднее | Structured output (JSON mode); retry; fallback на plain text. |
| **Длинные записи не влезают в context window LLM** | Средняя | Среднее | Chunk → summarize → merge. MapReduce pattern. |
| **Структура Obsidian vault неясна** | Средняя | Низкое | MVP: простой file export. PARA routing — V2. |
| **Несколько интерпретаций одной записи — как хранить** | Средняя | Среднее | ProcessedNote с version + profile_id. Отдельные .md файлы: `{date}-{topic}-{profile}.md` |
| **Whisper.net CoreML на Apple Silicon** | Низкая | Высокое | Fallback на whisper-cli subprocess (уже работает). |
| **Electron тяжёлый** | Низкая | Низкое | Для pet-project приемлемо. |

---

## 17. Открытые вопросы

1. **Wrap vs Rewrite граница:** конкретно что оставить как subprocess, а что переписать на C# в MVP? Текущее решение: всё subprocess, rewrite по необходимости.

2. **LLM выбор:** Ollama (standalone daemon) или LM Studio (GUI + API)? Или поддержать оба? Текущее решение: OpenAI-compatible HTTP API — работает с обоими.

3. **Минимальный контракт UI ↔ Backend:** REST API? gRPC? SignalR для real-time прогресса? Текущее решение: REST + SSE (Server-Sent Events) для прогресса.

4. **Obsidian: файловый экспорт vs REST API vs plugin:** MVP = файловый экспорт (просто, надёжно). V2 = REST API. Templater = опционально.

5. **Несколько интерпретаций одной записи:** разные файлы (`meeting-work.md`, `meeting-personal.md`)? Или один файл с секциями? Текущее решение: разные файлы, связанные через frontmatter `source_audio`.

6. **Как хранить модели:** в Application Support? Скачивать при первом запуске? Предлагать выбор? Текущее решение: Application Support + UI для скачивания.

7. **Очередь и массовая обработка:** in-memory queue? Persistent queue (SQLite)? Текущее решение: SQLite (ProcessingJob table) — crash-safe.

8. **Граница приложение ↔ Obsidian:** что делает приложение, а что делает Templater/Obsidian Copilot? Текущее решение: приложение делает всё до .md файла; Obsidian делает routing/linking/search потом.

---

## 18. Принципы разработки

1. **Wrap first, rewrite later.** Не переписываем работающее. Оборачиваем в UI.
2. **Каждый pipeline-этап — изолированный сервис.** Тестируемый отдельно. Заменяемый.
3. **SQLite как single source of truth.** Один файл, portable, debuggable.
4. **Profiles — first-class citizen.** Вся обработка параметризована профилем.
5. **Graceful degradation.** Если Ollama не запущен — skip summarization, дать raw transcript. Если Obsidian недоступен — сохранить .md локально.
6. **Идемпотентность.** Повторный прогон того же файла с тем же профилем — тот же результат. Перепрогон с другим профилем — новый ProcessedNote.
7. **Понятный код.** C# + TypeScript — весь код читаем всей команде. Claude помогает, но код должен быть понятен без Claude.
