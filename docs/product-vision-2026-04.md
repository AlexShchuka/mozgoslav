# Mozgoslav — vision and architecture (2026-04)

**Status:** Draft. Supersedes ADR-001 (`docs/product-vision.md`, "second brain for conversations").
**Date:** 2026-04-25
**Author:** shuka
**Type:** living vision + architecture decision. Updated when shape changes, not chronicled.

---

## 1. Vision

Mozgoslav — **личный голосо-первый harness вокруг любых LLM**. Локально слушает, помнит и действует за пользователя, который весь день проводит за компьютером. Голос — основной канал ввода. Корпус разговоров и заметок — долгая память. Локальные автономные агенты — руки. Почти весь движок — чужой open-source; своё — порты, клей, UX, вкус.

Слоган: **the Aristotle harness — voice-in, knowledge-and-actions-out, all local, all OSS.**

Mozgoslav — не диктофон, не транскрибатор, не ещё-один-meeting-AI. Это персональный control panel для оркестрации внимания и LLM-стека одного владельца.

---

## 2. Scope and audience

- **Аудитория**: один владелец-программист (shuka), плюс возможные друзья-контрибьюторы. Не для продажи, не для широкого пользователя.
- **Контекст использования**: macOS, программист за компом 8+ часов в день, частые митинги, личные заметки, желание автоматизировать рутину.
- **Платформы**: macOS-only сегодня. Расширение на Linux/Windows — non-goal в этом цикле.
- **Privacy posture**: local-first. Внешние outbound только в эндпоинты, явно сконфигурированные пользователем (LLM endpoint, Obsidian, локальные sidecar'ы, web-search upstream'ы — последние через локальный SearXNG-агрегатор).

---

## 3. Принципы (шесть)

Каждый принцип имеет операционный «отпечаток» в репозитории. Если принцип нельзя проверить тестом / lint'ом / артефактом — он эссе, а не принцип.

### 3.1. Voice-first

Печать конкурирует с мышлением за working memory; голос — нет. Программисту за компом 8+ часов нужен канал ввода, который не ломает поток. Голос — первичный канал во ВСЕ контексты: диктовка в чаты и документы, инструкции агенту, запросы к корпусу, системные действия.

Отпечаток: hotkey-инфраструктура, dictation pipeline, live transcription pipeline, voice-first Q&A UX.

### 3.2. Reuse-not-rewrite

Любая фича стартует с вопроса «какой OSS это уже делает?». Своё пишем только клей и UX. Если на свою реализацию уходит 3 недели — сначала час на поиск OSS-альтернативы.

«Не велосипед» — это про whisper / embeddings / vector store / agent loop / web search / cron / sandbox. Это НЕ про bizness-логику склейки этих компонентов под наш конкретный flow — она наша.

Отпечаток: Whisper.NET, Quartz, Polly, OpenTelemetry, Snapshooter, MAF, SearXNG, Trafilatura, MCP — всё стороннее. Мозгослав — пользователь библиотек, не их автор.

### 3.3. Чистая архитектура без жёсткого coupling

Порт-адаптер для каждого внешнего компонента. Domain ничего не знает про конкретные движки. Все провайдеры заменяемы, все провайдеры — singleton'ы за интерфейсом, конфигурируемые через DI.

Отпечаток: `Mozgoslav.Domain` без внешних зависимостей; `Mozgoslav.Application` — порты; `Mozgoslav.Infrastructure` — адаптеры; `Mozgoslav.Api` — composition root. То же на frontend'е (slice + saga + transport через `graphqlClient`/MCP).

### 3.4. Pet, не corp

Никаких OKR, sprint planning, design committee, story points, retro. История = git. Дизайн = markdown ADR в issues. Решения = owner. Tests — там где ломается, coverage — пол, не цель.

Pet ≠ amateur sloppy. Pet = «острое маленькое craft», единый владелец со вкусом, без процессного жира.

Отпечаток: ADR-как-issues, минимум `docs/`, `agent-gate.sh` как единственный gate.

### 3.5. AI-realization friendly

Репа эволюционирует руками Claude / других AI-агентов. Это требует:

- **Agent-native repo.** `AGENTS.md` (canonical) per слой: root / backend / frontend / native / python-sidecar (+ `searxng-sidecar` когда появится). `CLAUDE.md` остаётся как симлинк на `AGENTS.md` для обратной совместимости. Шесть секций: commands, testing, project structure, code style, git workflow, boundaries. Three-tier дисциплина boundaries: «always do / ask first / never do».
- **Living docs.** ADR в виде GitHub issues с label `type/decision` per архитектурное решение; `AGENTS.md` обновляется в том же PR что и затронутый код. AGENTS.md пишет владелец, не агент (LLM-сгенерённые AGENTS.md эмпирически *хуже* написанных руками).
- **Schema-first тестирование.** Smoke + schema/contract + snapshot для детерминированного. LLM-output'ы валидируются по структуре, не по точному тексту. Eval harnesses — отдельный трек, не gate'ят CI. Coverage — floor, не goal.
- **Маленькие самодостаточные модули с явными контрактами** — агент имплементит без чтения всей репы. Один класс на файл, явные ports, no-comments в коде (всё имена должны говорить сами).

Отпечаток: per-слой `AGENTS.md`, `uncomment --dry-run` гейт в CI, ADR-as-issue, `agent-gate.sh` как single-command verification.

### 3.6. Прозрачность процессов

Каждая LLM- / long-running-операция показывает explicit state: стадия, прогресс, время на стадию, успех/ошибка. Никаких чёрных ящиков на локальной модели. Локальные LLM медленные и flaky — без visibility пользователь думает «завис», доверие к агентам не возникает. Это не nice-to-have, а **price of entry** для локально-агентской системы.

Применяется во всех трёх столбах:
- **Столб 1.** Audio pipeline: 5+ стадий, на каждой — статус + прогресс + время + ошибка. Уже работает через `IJobProgressNotifier` и `ProcessingJob.{Status, Progress, CurrentStep, ErrorMessage, StartedAt, FinishedAt}`. Расширяем до per-stage timing breakdown.
- **Столб 2.** Unified retrieval: видны source'ы (corpus / web / vault), время каждого retrieval-шага, цитаты с разделением по типу источника.
- **Столб 3.** Agent loop: tool-calls, входы, выходы, шаги мышления — по аналогу `<thinking>`-блоков Claude, но для локальных flow.

Отпечаток: SSE / GraphQL Subscription канал для прогресс-событий; UI-компоненты ProgressBar + StageIndicator + AgentTrace.

---

## 4. Три столба

Архитектурно мозгослав = 3 продуктовые подсистемы, склеенные общим datapath'ом и общим UI-shell'ом.

### 4.1. Столб 1: Голос → Структура

Превращаем голос в структурированный текст / заметку / запись в Obsidian / системное действие.

**Что в продакшне сейчас**:
- Recording: WAV-захват через native Swift helper, импорт mp3/m4a/wav drag-drop'ом и file-picker'ом.
- Transcription: Whisper.NET, выбор моделей, prompt из профиля.
- Pipeline: 5 стадий с прогрессом — Transcribing → Correcting → LlmCorrection (опционально) → Summarizing → Exporting.
- Post-processing: profile-driven (system prompt + cleanup level + output template + export folder + tags template).
- Dictation: push-to-talk hotkey → Whisper-streaming → optional LLM polish → text injection в активное приложение через native helper. Per-app profiles.
- Live streaming transcript во время recording'а (только что shipped).
- Markdown export в Obsidian vault через файловый I/O. `_inbox/` — дефолт-папка для built-in профилей.
- Versioning: повторный прогон записи через другой профиль создаёт новый `ProcessedNote.Version`, исходный recording immutable.

**Заложенные направления** (vector'а столба, не фичи в этой версии):
- **Voice dump-mode**: глобальный hotkey, который запускает спонтанную запись (не push-to-talk инжект), складывает её сразу в `_inbox/` и автоматически прогоняет через дефолт-профиль. Цель — спонтанная мысль не теряется на «open-record-profile-stop».
- **On-the-fly LLM transform в dictation** (расширение текущего `DictationLlmPolish`): LLM на лету не только полирует phrasing, но превращает голосовую команду в системное действие (примеры: «напомни в пятницу позвонить Васе» → Apple Shortcut → reminders.app; «открой расшифровку вчерашнего митинга» → команда мозгославу). Граница «диктовки» и «команды агенту» размывается.
- **Inbox auto-process по cron**: помимо record-trigger'а, периодически проходить по `_inbox/`-папке (включая внешние drop-ins) и обрабатывать новое.

### 4.2. Столб 2: Unified Retrieval & Reasoning

«Гуглить по своей жизни и по интернету одной формулировкой».

**Что в продакшне сейчас**:
- Phase 0 RAG: `RagService` (chunk → embed → top-k cosine → LLM-synthesis с цитатами).
- Embeddings: `PythonSidecarEmbeddingService` через python-sidecar; `BagOfWordsEmbeddingService` как fallback.
- Vector store: `SqliteVectorIndex` (если `Mozgoslav:Rag:Persist=true`) или `InMemoryVectorIndex`.
- Auto-indexing: `RagIndexingProcessedNoteRepository` декорирует `IProcessedNoteRepository`, на каждый `AddAsync(note)` дёргает `_rag.IndexAsync(note)`. То есть индекс растёт синхронно с корпусом.
- HTTP-resilience у sidecar'а: Polly Standard Resilience (retry + circuit breaker + jitter).
- UI: `RagChat` страница (text-based ввод, рендер цитат).

**Заложенные направления**:
- **Hybrid retrieval**: BM25 через FTS5 рядом с dense, обе таблицы в одной SQLite. Лучше для proper nouns / дат / редких слов.
- **Cross-encoder rerank** в python-sidecar (модель уровня `bge-reranker-base` с RU-поддержкой; конкретный pin позже).
- **Metadata filter**: дата / профиль / спикер (когда будет diarization).
- **Web search**: новый sidecar `searxng-sidecar` (отдельный venv от python-sidecar, изолированный жизненный цикл). Default upstream'ы — конфигурируемые через `settings.yml`. Запросы уходят с локальной машины напрямую к upstream-движкам; user-decision: privacy vs RU-quality (DDG only vs DDG+Yandex+Google).
- **Web extract**: Trafilatura (BSD) в python-sidecar — boilerplate-cleanup перед скармливанием LLM. RU-aware.
- **Unified search agent**: agent loop диспатчит между `corpus.query`, `web.search`, `web.fetch`, `obsidian.read` тулзами; финальный ответ цитирует с разделением по типу источника.
- **Voice-first Q&A**: hotkey → dictation → агент → ответ голосом / в Obsidian.
- **Ассоциативный recall (HippoRAG-shape)** — отложено. Окупается когда корпус в сотнях митингов и видны реальные multi-hop запросы.

### 4.3. Столб 3: Намерение → Действие

Автономные агенты делают рутину, владельцу остаётся approve / переориентировать.

**Что в продакшне сейчас**: ничего значимого. Quartz.NET существует и обслуживает internal pipeline jobs (recording → process → export). User-facing autonomous agents — отсутствуют.

**Заложенные направления**:
- **Mozgoslav как MCP-сервер**: backend публикует tool'ы (`rag.query`, `recordings.search`, `notes.{get,list,create}`, `dictation.{start,stop}`, `obsidian.write`, `prompts.build`, `web.search`, `web.fetch`) через MCP. Любой MCP-aware клиент (Claude Desktop, Cursor, Continue.dev, наш собственный agent runner) использует одинаковый surface.
- **Mozgoslav как MCP-клиент**: agent runner потребляет внешние MCP-серверы как tool'ы (когда понадобится).
- **Agent runner**: Microsoft Agent Framework 1.0 (MAF). .NET-native, MCP first-class, MIT, GA с 2026-04-03. Альтернативы (LangGraph в python-sidecar, DIY) рассматривались и отброшены — see decision-issue.
- **Cron-routines**: Quartz-triggered MAF flows — например, утренний digest вчерашних записей; ночной inbox-process; weekly summary.
- **Event-trigger skills**: после recording finalize → action-extractor agent → list of action items в `_inbox/actions/`.
- **System actions**: новый порт `ISystemAction` через native helper + Apple Shortcuts → reminders.app, calendar.app, файловые операции в vault.
- **Prompt-builder для внешнего Claude**: `IPromptBuilder` curate'ит контекст (RAG-выжимка + recent recordings + repo state) → собирает структурированный prompt → диспатчит в Claude Code / Claude Desktop через clipboard / CLI. Внешний Claude остаётся snowflake'ом, мозгослав — его prompt-builder + result-collector.

---

## 5. Non-goals

- **Облачная синхронизация / multi-device.** Syncthing уже есть для опционального backup; больше не наращиваем.
- **Multi-tenant / shared-user.** Mozgoslav single-user.
- **Mobile app.** macOS desktop only.
- **Cloud LLM как dependency.** Cloud-endpoint можно подключить (OpenAI-compatible), но дефолт и архитектура — локальная.
- **Live meeting copilot (factcheck-during-call, real-time prompts).** Деприоритизирован — слишком UX-fragile, value не оправдывает latency-риск на локальных моделях.
- **Voice Wake / Talk Mode** в стиле all-listening assistant'а. Не делаем — privacy-токсично, дублирует push-to-talk.
- **Multi-channel inbox** (Slack/Discord/iMessage/Email native integration). Если понадобится — подключается через MCP-tool, не через core.
- **Sandbox для bash/exec.** Агенты вызывают только наши MCP-tools, shell не получают.

---

## 6. Архитектура

### 6.1. Композиция процессов

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           Electron App (main process)                     │
│   - lifecycle всех subprocess'ов                                          │
│   - native APIs (tray, dock, file dialogs, hotkey registration)           │
│   - secure preload bridge для renderer                                    │
└──┬─────────────────────────────────────────────────────────────────────┬─┘
   │                                                                     │
   │ IPC                                                                 │
   │                                                                     │
┌──▼──────────────────────┐  ┌─────────────────────┐  ┌─────────────────┐
│  Renderer (React+TS)    │  │  Backend (.NET 10)  │  │ Native helper    │
│  - UI only               │  │  - Domain/App/Infra │  │ (Swift, macOS)   │
│  - Saga для transport    │◄─┤  - GraphQL + MCP    │  │ - AVFoundation   │
│  - styled-components     │  │  - Quartz cron      │  │ - injection      │
│                          │  │  - MAF agent runner │  │ - hotkey monitor │
└──────────────────────────┘  └─┬───────────────────┘  └──────────────────┘
                                │ HTTP loopback
            ┌───────────────────┴────────────┬──────────────────┐
            │                                │                  │
   ┌────────▼─────────┐         ┌────────────▼──────┐  ┌────────▼─────────┐
   │ python-sidecar   │         │ searxng-sidecar   │  │ user-configured  │
   │ FastAPI          │         │ SearXNG           │  │ LLM endpoint     │
   │ - cleanup        │         │ - meta-search     │  │ (LM Studio,      │
   │ - diarize        │         │ - upstream:       │  │  Ollama, ...)    │
   │ - embed          │         │   DDG/Yandex/...  │  │                  │
   │ - rerank (new)   │         │ - own venv        │  └──────────────────┘
   │ - emotion/gender │         │                   │
   │ - ner            │         │                   │
   │ - trafilatura    │         │                   │
   │   (web extract)  │         │                   │
   └──────────────────┘         └───────────────────┘
```

**Жизненный цикл**: Electron main владеет lifecycle'ами всех subprocess'ов через единый supervisor (`backendLauncher` сегодня, расширяется до multi-service). Backend — оркестратор бизнес-логики и единственный, кто говорит с GraphQL/MCP клиентами. Sidecar'ы — pure-function HTTP-сервисы, без shared state.

### 6.2. Ports (Application слой) и реализации

Существующие порты (текущая база): `ITranscriptionService`, `ILlmService` / `ILlmProvider`, `IEmbeddingService`, `IVectorIndex`, `IRagService`, `IDictationSessionManager`, `IRecordingPartialsNotifier`, `IJobProgressNotifier`, `IProcessingJobScheduler`, `IAudioRecorder`, `IMarkdownExporter`, `IObsidianClient`, `ISyncthingClient`, `IAppSettings`, `IPythonSidecarClient` и репозитории.

**Новые порты под target architecture**:

| Порт | Назначение | Дефолт-провайдер |
|---|---|---|
| `IAgentRunner` | Запуск agent loop'ов (single + multi-step) | `MafAgentRunner` (MAF 1.0) |
| `IMcpServer` | Публикация tool'ов мозгослава по MCP | через MAF |
| `IMcpClient` | Потребление внешних MCP-серверов | через MAF |
| `IWebSearch` | Web-поиск | `SearXNGProvider` (loopback) |
| `IWebContentExtractor` | Boilerplate-cleanup веб-страниц | `TrafilaturaProvider` (sidecar) |
| `IRetriever` | Hybrid corpus retrieval (dense + BM25 + filter) | `HybridRetriever` поверх существующих |
| `IReranker` | Cross-encoder rerank | `BgeRerankerProvider` (sidecar) |
| `IPromptBuilder` | Curated-context prompt'ы для внешних LLM-клиентов (Claude Desktop, Code) | `MozgoslavPromptBuilder` |
| `ISystemAction` | macOS системные действия (reminders, calendar, fs) | `AppleShortcutsProvider` (через native helper) |
| `ILlmCapabilities` | Capability-detection локальной LLM (function-calling, JSON mode, ctx-length) | `OpenAiCompatibleCapabilitiesProbe` |

Каждый новый порт — 1 интерфейс + 1 default-провайдер + DI-регистрация + `NoOpProvider` для disable-сценариев.

### 6.3. Outbound network policy (target)

```
allow loopback:
  - python-sidecar
  - searxng-sidecar
  - LLM endpoint (configured)
  - Obsidian REST (configured)

allow non-loopback:
  - upstream search engines via SearXNG (privacy уровня "loopback aggregator anonymises")
  - web fetches на конкретные URL'ы (per-domain user decision; default — fetch разрешён только URL'ам, которые SearXNG вернул в результатах)
  - upstream LLM endpoint (если пользователь сконфигурировал cloud, не локальный)

deny by default:
  - всё остальное (telemetry, crash reporting, auto-update phone-home, ...)
```

### 6.4. Storage

- Single SQLite (`mozgoslav.db`): domain + settings + RAG vectors + RagChat history.
- Schema через `EnsureCreatedAsync`, не миграции — drop on schema change (issue #77 предлагает перейти на EF migrations; решение отложено).
- Secrets в SQLite settings, никогда в env / logs / disk.
- Vault — внешний (Obsidian path, конфигурируемый). Mozgoslav пишет markdown через файловый I/O.

### 6.5. Что уходит из старой ADR-001

- «Live transcription = сложно, не MVP» — устарело, shipped.
- «V3 RAG-запросы» — RAG в активной разработке (Phase 0 в проде, hybrid в Pillar 2-roadmap).
- «OpenCode-сайдбар» (issues #113-#116) — отбросили, заменено на embedded MAF agent runner + MCP-сервер.
- «Wrap-not-rewrite» — расширено до **Reuse-not-rewrite** (распространяется не только на legacy console pipeline, но и на любую новую фичу).
- «Pet-project (упомянуто)» — повышено в эксплицитный принцип, влияющий на процессы.

---

## 7. Open-source выбор (что используем, не пишем)

| Слой | OSS-выбор | Лицензия | Зачем именно это |
|---|---|---|---|
| Agent runner | Microsoft Agent Framework 1.0 | MIT | .NET-native, MCP first-class, GA 2026-04-03 |
| MCP transport | через MAF | MIT | nативная имплементация client+server |
| Web search | SearXNG (self-host в sidecar) | AGPL-3.0 | meta-search 70+ источников, privacy-aware |
| Web extract | Trafilatura | BSD | RU-aware, best-in-class boilerplate cleanup |
| LLM transport | OpenAI-compatible HTTP | — | работает с LM Studio / Ollama / vLLM / cloud |
| Cron / scheduling | Quartz.NET | Apache-2.0 | уже в репе, persistent jobs |
| Resilience | Polly + Microsoft.Extensions.Resilience | MIT | retry / circuit breaker / jitter |
| Speech-to-text | Whisper.NET | MIT | уже в репе |
| VAD | Silero | MIT | уже в репе |
| Embeddings | python-sidecar (sentence-transformers) | Apache-2.0 / MIT | через `IEmbeddingService` порт |
| Cross-encoder | bge-reranker-base (или RU-tuned) | MIT | модель определится при имплементации |
| GraphQL | HotChocolate 15 | MIT | уже в репе |
| Telemetry | OpenTelemetry + Prometheus exporter | Apache-2.0 | уже в репе, loopback-only metrics |
| Tests (.NET) | MSTest + FluentAssertions + NSubstitute + Snapshooter | MIT | уже в репе |
| Tests (frontend) | Jest + redux-saga-test-plan | MIT | уже в репе |

**Что НЕ берём (с обоснованием)**:
- **OpenClaw** — 90% веса не наше (multi-channel inbox, Voice Wake, Canvas). 5-month-old репа, 14k issues. Под наш scope — overspec.
- **OpenCode (sst/opencode)** — code-task agent, узкий. Дублирует MAF-based flow для нашего use-case без преимуществ.
- **LangGraph в python-sidecar** — рассматривался для agent runner. C# → python → MCP → C# архитектурный круг. Отброшен в пользу .NET-native MAF.
- **Tavily / Exa / Brave API** для web search — RU-quality слабее SearXNG-через-Yandex; платные; не self-host.

---

## 8. Дисциплина (operational, для сохранения вижна)

Эти артефакты — не вижн, но они держат вижн в живом состоянии.

- **`AGENTS.md` per слой** (root, backend, frontend, native, python-sidecar, searxng-sidecar после bootstrap'а). Canonical, `CLAUDE.md` — symlink.
- **`agent-gate.sh`** — single-command локальный мирror CI: encoding + uncomment + build + tests + lint. Зелёный gate = можно push'ить.
- **`uncomment --dry-run`** — hard-gate: ноль `// /* */ ///` комментариев в коде. Имена должны говорить сами.
- **ADRs as GitHub issues** с label `type/decision` — не файлы в `docs/`. Шаблон `.github/ISSUE_TEMPLATE/decision.yml`.
- **Backlog as GitHub issues** с label `type/backlog`. Шаблон `.github/ISSUE_TEMPLATE/backlog.yml`. Структура: Context / Problem / Proposal / Acceptance / Rejected.
- **Эпики = GitHub Milestones**. Children-issue имеют milestone-binding; прогресс эпика виден на milestone-странице. Никаких parent-issue per эпик — milestone заменяет.
- **Roadmap = GitHub Projects** ([project board](https://github.com/users/AlexShchuka/projects/1)). Columns waves: Now / Next / Later. Не отдельный markdown-файл.
- **Зависимости между issue'ями** — GitHub native Issue Dependencies (`Blocked by` / `Blocks`), задаются через UI или API. Прозы `Depends on: #N` в body избегаем — есть native механизм с graph-view'ем.
- **Renovate** управляет dependency-обновлениями. Pinning у всех пакетов.
- **Lefthook**: pre-commit (format), pre-push (gitleaks + `MOZGOSLAV_HUMAN_PUSH=1` гейт — агенты не пушат сами).
- **Conventional commits** через commitlint. PR-title = squash-merge сообщение, ≤100 chars.
- **Migration-style**: fast-cut, без двухфазной co-existence; CI всегда зелёный после rewrite.

---

## 9. Backlog organisation

Задачи группируются по **эпикам** (parent-issue с GitHub Tasklist подчинённых). Эпики не маппятся на pillar'а 1-к-1 — каждый эпик — концептуальная единица работы:

- **Epic 0: Vision foundations.** ADR-002 (этот документ принимается как решение), spring-cleaning старых issue'ов, новые feature labels в template'ах.
- **Epic A: Pillar 2 — Unified Retrieval.** Hybrid retrieval, rerank, metadata-filter, web search sidecar, web extract, fuse-agent.
- **Epic B: Pillar 1 — Voice extensions.** Voice dump-mode, on-the-fly transform broader than polish, inbox auto-process по cron'у.
- **Epic C: Pillar 3 — Intent → Action.** MAF + IAgentRunner, MCP server, action-extractor skill, reminders skill, prompt-builder для внешнего Claude.
- **Epic D: Refactor while young.** Settings single source of truth, ports skeleton, capability detection, UX cleanup (Home split, Queue resurrect, RecordingList kill, Onboarding-as-tour).
- **Epic E: Documentation continuity.** Roadmap doc (waves: now / next / later), supersedes-mapping старых ADR-issues.

**Label conventions**:
- `feature/<concrete-name>` — `agents` (новый), `mcp` (новый), `web-search` (новый), `transparency` (новый, опционально), `recording`, `rag`, `obsidian`, `dictation`, `ui`, `testing`, etc.
- `type/{backlog | bug | decision}` — стандартно.
- `status/*` — опционально (`proposed`, `grooming-primary-analysis`, `shipped`, ...).
- Pillar mapping в issue body, не в labels — labels должны быть concrete-feature-level.

**Что НЕ маппим**:
- `feature/pillar-1` / `feature/pillar-2` — не делаем.
- Per-epic labels — не делаем.

---

## 10. Open questions / непроверенные / спорные моменты реализации

Эта секция — для обсуждения. Не блокирует принятие вижна; блокирует имплементацию конкретных эпиков.

### 10.1. Имплементационные неуверенности

- **MAF maturity в .NET specifically.** GA 2026-04-03. Primary language репы — Python. .NET-package coverage надо проверить эмпирически прежде чем глубоко адоптировать (особенно multi-agent pattern'ы — handoff, Magentic-One, group chat).
- **MCP-server через MAF на .NET — реальный surface.** Документация говорит «MCP first-class», нужен прототип на 1-2 часа для подтверждения, что наш набор tool'ов выражается без боли.
- **SearXNG default upstream'ы.** Privacy vs RU-quality fork: только DDG (privacy max, RU слабее) vs DDG+Yandex (RU max, IP видно Yandex'у) vs DDG+Yandex+Google (RU max + общий охват, IP видно троим). User-decision при имплементации.
- **Trafilatura RU-quality.** Заявлено multilingual, нужен sample test на нескольких русских сайтах перед локом.
- **Cross-encoder reranker model.** `bge-reranker-base` поддерживает RU частично; есть RU-tuned варианты (e.g. `cross-encoder/ms-marco-MiniLM-L-12-v2-ru`). Выбор после A/B на реальных запросах.
- **DictationLlmPolish vs broader on-the-fly transform.** Сейчас `Polish` — только phrasing-clean-up. Vector «расширять команды в Apple Shortcuts» — отдельный путь, не extension существующего Polish. Граница «диктовка vs команда агенту» — UX-открытый вопрос.
- **Voice dump-mode delta vs существующий persistOnStop=true Dashboard recording.** Технически dump-mode = глобальный hotkey на тот же flow, без открытия Dashboard'а. UX-граница «дикsion → инжект» vs «dump → persist» — flag на hotkey'е.
- **Capability-detection локальной LLM.** Сейчас `ILlmService` не пробует модель на старте. Function-calling на 7B Qwen работает, на 3B — нет. Нужен ProbeOnConnect → store flags → gate features. Не реализовано.
- **Quartz vs MAF cron — точная граница.** Тезис: Quartz = internal pipeline jobs (transcribe/process/export), MAF-Quartz-triggered = user-facing routines. Грань может смазываться при имплементации.
- **Apple Shortcuts через native helper.** Native helper умеет AVFoundation + injection + hotkey. Shortcut invocation — отдельная capability, native-side нужен новый IPC-метод (`shortcut.run`).
- **MCP server — в backend C# или в python-sidecar?** Если MAF умеет публиковать .NET-tool'ы как MCP — backend. Если боль — sidecar wrapper. Не проверено.
- **Что Claude Desktop / Cursor реально дают через MCP сегодня.** Подключение их к нашему MCP-server'у — UX-trivial (manifest в `~/.claude/` / settings). Реальная UX-польза от их использования над нашими tool'ами — не проверена.
- **Voice Q&A — TTS-ответ или Markdown-ответ или оба?** Не зафиксировано.
- **Bag-of-words embedding fallback ретайр.** Issue #83 уже планирует. Тайминг привязан к гарантии sidecar uptime.
- **RAG `Persist=false` дефолт.** Намеренное (in-memory быстрее, не лезет в SQLite на каждый AddAsync) или unintentional? Под target — `Persist=true` дефолт, in-memory только для тестов.
- **Live transcription — финальный shape.** Только что shipped. Может потребоваться доработка после dogfooding'а 1-2 недель.
- **Process supervisor: один или несколько?** Сейчас `backendLauncher.ts` управляет backend'ом. searxng-sidecar и расширения python-sidecar — разные процессы, supervisor должен научиться запускать N сервисов с health-check'ами. Не реализовано.

### 10.2. Открытые архитектурные fork'и

- **MCP authn между мозгославом и внешними клиентами.** Mozgoslav MCP exposed на loopback — нужен ли token? MAF default — fail-closed auth.
- **Multi-agent vs single-agent default.** MAF поддерживает sequential/concurrent/handoff/group-chat. Под наш scope (один пользователь, один runtime) — start с single-agent loop'ом, multi-agent — extension-вариант.
- **A2A protocol** (cross-framework agent collab) — выключаем сейчас (не нужен), но MAF его всё равно ship'ит.
- **HippoRAG-shape recall.** Когда подключать? Триггер — корпус >100 митингов И видны multi-hop запросы у пользователя. Не сейчас.
- **`docs/` стратегия.** Сегодня — только `product-vision.md` + `runbooks/`. ADRs живут в issues. Этот документ (vision-2026-04) — исключение или паттерн? Решение: vision/architecture documents ОК как `docs/*.md` (живые, агрегированные); конкретные decisions = issues.

---

## 11. Что этот документ supersede'ит

- **`docs/product-vision.md` (ADR-001).** Сохраняется в репе как историческая справка. Все противоречия в пользу нынешнего документа.
- **Issues `feature/opencode/*` (#69-#76, #113-#116)** — будут закрыты в Epic 0 spring-cleaning с pointer'ом на новый эпик C (MAF + MCP). Часть полезных требований (keychain-backed secrets, MCP discovery UI, per-project settings) переезжает в новые issues под `feature/agents` / `feature/mcp`.
- **Issue #62 `meeting bot integration`** — переоценивается под non-goal «live meeting copilot».
- **Любой остаток ADR-issue, противоречащий настоящему документу** — закрывается с supersedes-pointer'ом.

Полный mapping старых issues → новых задач — в отдельном файле `docs/issues-migration-plan.md` (создаётся следующим шагом).

---

## 12. Приёмка этого документа

Документ принят в момент merge'а PR с этим файлом. Принятие = согласие со scope'ом, принципами, столбами, архитектурными решениями. Open questions из секции 10 — отдельные обсуждения, не блокеры.

Дальнейшие изменения вижна — через PR с правкой этого файла + обновление per-слой `AGENTS.md` где затронуто.
