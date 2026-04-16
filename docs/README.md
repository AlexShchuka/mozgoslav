# Mozgoslav — как это устроено

## Pipeline

```
аудио → 16kHz mono WAV → Whisper транскрибация → filler cleanup / term correction →
LLM суммаризация (structured JSON) → markdown + frontmatter → Obsidian vault
```

Всё локально. SQLite как single source of truth. Каждая запись (Recording) — immutable; из неё можно сделать много ProcessedNote по разным профилям.

## Компоненты

- **backend/** — C# ASP.NET Minimal API. DDD-раскладка: Domain → Application → Infrastructure → Api. Хранилище — SQLite + Dapper. Транскрибация — Whisper.net (CoreML). LLM — OpenAI SDK поверх LM Studio / Ollama.
- **frontend/** — Electron + React + TypeScript strict + Redux + Redux-Saga + styled-components. Feature-based структура. HTTP — Axios BaseApi. Общение с backend через REST + SSE для прогресса.
- **python-sidecar/** — FastAPI. Эндпоинты для ML-тяжёлых задач (diarization Silero+Resemblyzer, gender/emotion audeering, NER Natasha). Подключается в V3.

## Профили обработки

Каждая запись прогоняется по профилю:
- **Рабочий** — сухой протокол: задачи, решения, участники, дедлайны.
- **Неформальный** — общий смысл, контекст, шутки как шутки.
- **Полная заметка** — всё, без обрезания.
- **Кастомный** — свой system prompt + template.

Повторный прогон другим профилем создаёт новый `ProcessedNote` с тем же `recording_id` — source один, интерпретаций много.

## Roadmap

- **MVP** — scaffolding, запись/импорт, транскрибация, LLM summary, markdown export в Obsidian.
- **V2** — пользовательские профили (CRUD), glossary для коррекции, aggregated notes, Obsidian REST API.
- **V3** — diarization, gender, emotion, NER через python-sidecar, speaker identification, live transcription.

Актуальный backlog см. в `../TODO.md`.
