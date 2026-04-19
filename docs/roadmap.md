# Roadmap

Drop-zone для фич, которые обсуждались, но не требуют отдельного ADR (мелкие, очевидные, ждут зрелости приоритета).

## Ближайший следующий MR (маленькие победы)

### 🎯 Дешёвые и сильно полезные

- **Full-text search (SQLite FTS5)** — по транскриптам + заметкам. `virtual table` over `ProcessedNotes` и
  `Transcripts.Segments`. Endpoint `GET /api/search?q=…` → list hits со snippet'ами.
- **Action items extraction** — prompt-расширение существующего `CorrectionService`. Вытаскивает «кто / что / к какой
  дате» → хранится в `ProcessedNote.ActionItems`. Уже есть value-object `ActionItem`, `MarkdownGenerator` умеет
  рендерить. Просто доделать LLM-промпт.
- **Daily note auto-append** — в Obsidian vault файл `YYYY-MM-DD.md` (создаётся если нет), добавляется секция
  `## Conversations` с линками на сегодняшние ProcessedNote. Через `ObsidianSetupService` + новый `DailyNoteAppender`
  service.
- **Chunking длинных записей по темам через LLM** — в `OpenAiCompatibleLlmService` уже есть chunk+merge; дополнительно
  LLM определяет topic-boundaries, markdown получает `## Topic 1 / ## Topic 2`.
- **Diarization в python-sidecar (pyannote)** — активация существующего stub'а. При успехе
  `ProcessedNote.Speakers: string[]` + per-segment speaker label.
- **Command palette (Cmd+K)** — `kbar` уже в deps. Quick-actions: `Open Settings`, `Import Recording`,
  `Show pairing QR`, `Ask your notes` (когда будет RAG).

### 📦 Infrastructure / dev-experience

- **`electron-builder --mac`** — сборка `.app` + `.dmg` с code-signing. CI job для release на macos-latest.
- **Auto-update (electron-updater)** — после того как появится публичный release-флоу. Приватный — через GitHub Releases
  и signed DMG.
- **Localization coverage** — пройтись по всем компонентам, добить ключи `ru`/`en`.
- **Better error UX** — toast-нотификации для API failures + retry button.

## Средний горизонт

### 🎯 Серьёзные фичи (может потребовать ADR)

- **Periodic review / spaced-repetition** — старые заметки всплывают через `Daily note` / command palette. Нужен
  алгоритм SRS.
- **Vector-search поверх FTS** (когда есть embeddings из ADR-005 RAG) — гибридный search.
- **Encrypted folders в Syncthing** — если появится untrusted-peer use case.
- **Selective sync** — пользователь выбирает какие под-папки vault'а синкать.
- **Multi-provider LLM** — Ollama / Claude / Groq / OpenRouter, как в meetily. Отдельный ADR.
- **Time-based timeline view** — обзор conversations по дате.
- **Export formats** — PDF, docx, notion-format.

### 🛠 Tooling

- **Onboarding telemetry (opt-in, local-only)** — считать какие permissions granted, ускорить диагностику. НЕ слать
  наружу.
- **Full lefthook coverage** — pre-push с быстрыми тестами для изменённых проектов.
- **Renovate / dependabot** — автообновления depend'ов в public repo.

## Далёкий горизонт / «а было бы прикольно»

- **Web clipper** — Chrome/Safari extension: сохранить статью + голосовой комментарий → отдельный ProcessedNote.
- **Email/Slack integration через копирование** — UI кнопка «Copy as email-ready markdown» (без OAuth).
- **PDF / video import** — extract audio → обычный pipeline.
- **AppleScript / Shortcuts integration** — macOS Shortcuts для «record a quick thought», «show today's notes».

## 🚫 Отвергнуто (чтобы не возвращаться)

- **Screen context awareness через screenshot фокусного окна** — Wispr Flow так делает → массовые privacy-жалобы. NO.
- **Cloud backup через наши сервера** — против privacy-first. Syncthing P2P — единственный допустимый sync.
- **Telemetry / usage analytics через сеть** — CLAUDE.md: zero telemetry.
- **Multi-user / sharing** — solo second-brain, другой продукт.
- **Web UI Syncthing'а** (`:8384`) — наше управление через REST внутрь. Внешний UI не открываем.

## Где что зафиксировано формально

- **ADR-002** — Global dictation (active MR).
- **ADR-003** — Syncthing integration (active MR).
- **ADR-004** — Dictation & Sync refinements (active MR).
- **ADR-005** — Local RAG Q&A (future).
- **ADR-006** — Calendar + meeting autostart (future).
- **Этот roadmap** — всё остальное, мелкое/очевидное.

## Где что зафиксировано в коде

- `TODO.md` (root) — краткий backlog для active development.
- `backend/CLAUDE.md` — architectural conventions.
- `docs/meetily-inheritance.md` — что взято из upstream.
- `docs/bluetooth-playback-notice.md` — macOS caveat.
- `.archive/` — устаревшее, не читать агентам.
