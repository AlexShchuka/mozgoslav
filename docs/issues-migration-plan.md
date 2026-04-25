# Issues migration plan — vision-2026-04

**Status:** Approved (Q3-Q7 closed). Ready for execution via `scripts/migrate-issues-2026-04.sh`.
**Date:** 2026-04-25
**Goal:** перевести 63 существующих open-issue в порядок, согласованный с новым вижном (`docs/product-vision-2026-04.md`), и завести новый набор parent-эпиков с зависимостями через GitHub Tasklists.

---

## 1. Стратегия миграции

1. **Принять новый вижн** (PR с `docs/product-vision-2026-04.md` смержен).
2. **Расширить label taxonomy** — добавить новые `feature/*` опции в `.github/ISSUE_TEMPLATE/{backlog,decision,bug}.yml`. Старые `opencode` и `meetings` **удалены** из dropdown'ов (исторические issue'ы сохраняют label, но новых не создать).
3. **Завести `status/icebox` label** (Q3=C) для отложенных без скоупа.
4. **Завести 6 parent-эпиков** (Epic 0 + Epic A-F) с tasklist'ами.
5. **Каждое существующее issue классифицировать**:
   - **KEEP** — оставить open, заменить лейбл на новый таксономии (если изменилось feature-area), привязать к эпику через Tasklist.
   - **FOLD** — content вытащить в новый child-issue под эпиком, старое закрыть с supersedes-pointer'ом.
   - **CLOSE** — закрыть с комментарием-pointer'ом (obsolete по новому вижну, content не сохраняем).
   - **ICEBOX (Q3=C)** — оставить open, навесить `status/icebox`, без привязки к эпику. Не закрываем — видны в backlog как «когда-нибудь».
6. **Завести новые child-issue** под эпики (full template body, Q7=B).
7. **Связать всё через Tasklists** — parent issue имеет `tasklist` блок со ссылками на children.

**Принцип fast-cut**: миграция выполняется одним проходом, не двухфазно. После применения — backlog в новом порядке, старые ссылки рерайтятся комментариями. CI зелёный весь период.

**Исполнение** (Q5=A): через скрипт `scripts/migrate-issues-2026-04.sh`. Скрипт идемпотентен (можно прогнать повторно — уже выполненные операции пропускаются). Body новых issue'ов читаются из `docs/issues-bodies/<slug>.md`.

---

## 2. Изменения в label taxonomy

### Добавить новые `feature/*` опции в template'ах

| Label | Зачем |
|---|---|
| `feature/agents` | Pillar 3 — MAF agent runner, autonomous skills, agent orchestration |
| `feature/mcp` | MCP server (mozgoslav публикует tool'ы) и MCP-client (мозгослав потребляет внешние) |
| `feature/web-search` | SearXNG sidecar, IWebSearch, IWebContentExtractor (Trafilatura) |
| `feature/prompt-builder` | Curated context для внешнего Claude Desktop / Claude Code |
| `feature/system-action` | Apple Shortcuts → reminders / calendar / fs operations |

### Сохранить (без изменений)

`recording`, `rag`, `obsidian`, `dictation`, `ui`, `testing`, `tooling`, `api`, `profiles`, `persistence`, `distribution`, `observability`, `sync`.

### Снять (deprecated, не удалять template, но не использовать)

| Label | Причина |
|---|---|
| `feature/opencode` | OpenCode pivot — заменили на `feature/agents` + `feature/mcp` |
| `feature/meetings` | Live meeting copilot — non-goal в новом вижне |

Применение: edit `.github/ISSUE_TEMPLATE/backlog.yml`, `decision.yml`, `bug.yml` — добавить новые опции в dropdown, оставить старые для исторических issue'ов (GitHub не требует, чтобы все старые issue'ы соответствовали новому списку).

### Дополнительный label (опциональный)

`status/epic` — для parent-issue эпиков. Альтернатива: использовать только `type/decision` + tasklist.

---

## 3. Структура эпиков (parent-issue per эпик)

Каждый эпик — `type/decision` issue, body = decision-summary + Tasklist children. Children — обычные `type/backlog` issue'ы под одним feature-label.

| Epic | Title | Primary label | Status |
|---|---|---|---|
| **Epic 0** | Vision foundations 2026-04 | `feature/tooling` | блокирует все остальные |
| **Epic A** | Pillar 2 — Unified Retrieval & Reasoning | `feature/rag` | core |
| **Epic B** | Pillar 1 — Voice extensions | `feature/dictation` | core |
| **Epic C** | Pillar 3 — Intent → Action (MAF + MCP) | `feature/agents` | core |
| **Epic D** | Refactor while young | `feature/tooling` | parallel |
| **Epic E** | UX & documentation continuity | `feature/ui` | parallel |
| **Epic F** | Operations — distribution + testing rigor | `feature/distribution` | parallel (Q4=A) |

### 3.1. Epic 0 — Vision foundations

**Goal**: формальное принятие нового вижна, чистка backlog, расширение label taxonomy.

**Children (новые issue'ы)**:
- E0.1 [type/decision] Принять `docs/product-vision-2026-04.md` как ADR-002 (supersedes ADR-001)
- E0.2 [type/backlog, feature/tooling] Расширить `.github/ISSUE_TEMPLATE/*.yml` новыми feature-опциями (`agents`, `mcp`, `web-search`, `prompt-builder`, `system-action`)
- E0.3 [type/backlog, feature/tooling] Spring-cleaning старых issue'ов — закрыть obsolete, перевешать labels, привязать KEEP'ы к эпикам через Tasklists

### 3.2. Epic A — Pillar 2 (Unified Retrieval)

**Goal**: «гуглить по своей жизни и интернету одной формулировкой», multi-source fuse через MAF agent loop.

**Children**:
- EA.1 [feature/rag] Hybrid retrieval (BM25 via FTS5 + dense)
- EA.2 [feature/rag] Cross-encoder rerank в python-sidecar (модель TBD)
- EA.3 [feature/rag] Metadata filter (date / profile / speaker)
- EA.4 [feature/web-search] `searxng-sidecar` bootstrap (own venv, lifecycle, healthcheck)
- EA.5 [feature/web-search] `IWebSearch` port + `SearXNGProvider`
- EA.6 [feature/web-search] `IWebContentExtractor` port + `TrafilaturaProvider` в python-sidecar
- EA.7 [feature/web-search] Settings UI: edit `searxng-sidecar/settings.yml` через GUI
- EA.8 [feature/agents] Unified search MAF workflow (corpus + web tools, fuse + cite-by-source) — depends on Epic C launching MAF
- EA.9 [feature/ui] Ask page — split citations by source-type (corpus / vault / web)
- EA.10 [feature/rag] Voice-first Q&A (hotkey → dictation → unified search → answer in markdown / TTS) — depends on EA.8

### 3.3. Epic B — Pillar 1 (Voice extensions)

**Goal**: голос как primary input во ВСЕ контексты — не только запись митинга и push-to-talk инжект.

**Children**:
- EB.1 [feature/dictation] Voice dump-mode (глобальный hotkey → spontaneous record → `_inbox/` + дефолт-профиль)
- EB.2 [feature/dictation] On-the-fly LLM transform (расширение `DictationLlmPolish` от phrasing-cleanup до command-recognition: «напомни в пятницу» → Apple Shortcut)
- EB.3 [feature/dictation] Inbox auto-process по cron'у (Quartz job, проходит по новым файлам в `_inbox/`-watch-папке)
- EB.4 [feature/recording] Per-stage timing breakdown в `ProcessingJob` (Принцип 6 deepening)

### 3.4. Epic C — Pillar 3 (Intent → Action)

**Goal**: автономные локальные агенты, MCP-bus, prompt-builder для внешнего Claude.

**Children**:
- EC.1 [type/decision, feature/agents] ADR: agent runner = MAF 1.0; alternatives rejected
- EC.2 [feature/agents] Add MAF NuGet refs to backend + `IAgentRunner` port + `MafAgentRunner` default + `NoOpAgentRunner`
- EC.3 [feature/mcp] `IMcpServer` port (через MAF) — публикация tool'ов мозгослава
- EC.4 [feature/mcp] MCP tools: `rag.query`, `recordings.search`, `notes.{get,list,create}`, `dictation.{start,stop}`, `obsidian.write`, `web.search`, `web.fetch` (последние два после Epic A.5/A.6)
- EC.5 [feature/agents] Skill: post-recording action-extractor (event-trigger after `RecordingStatus.Transcribed` → action items в `_inbox/actions/`)
- EC.6 [feature/system-action] `ISystemAction` port + `AppleShortcutsProvider` (через native helper)
- EC.7 [feature/agents] Skill: action-items → reminders.app via Shortcuts (depends on EC.6)
- EC.8 [feature/prompt-builder] `IPromptBuilder` port + curated-context flow (RAG-выжимка + recent recordings + repo state) → clipboard / Claude Code CLI
- EC.9 [feature/ui] Routines page (UI для cron / event-triggered skills)
- EC.10 [feature/ui] Prompts page (UI для prompt-builder, list / edit / dispatch)
- EC.11 [feature/agents] `ILlmCapabilities` port + probe-on-connect (function-calling / JSON mode / ctx-length detection); gating skills по capabilities

### 3.5. Epic D — Refactor while young

**Goal**: архитектурные склейки сделать пока репа маленькая.

**Children**:
- ED.1 [feature/tooling] Settings single source of truth (move `whisperModelPath` → Models, `vaultPath` → Obsidian, etc.)
- ED.2 [feature/persistence] EF migrations вместо `EnsureCreatedAsync` (folds #77 — сохраняем content)
- ED.3 [feature/api] Internal contract with Swift helper (folds #58 — typed schema)
- ED.4 [feature/api] Domain types not from API clients (folds #57 — port discipline)
- ED.5 [feature/tooling] Process supervisor: lifecycle backend + python-sidecar + searxng-sidecar + native helper as one tree (folds #124)
- ED.6 [feature/recording] LLM client resilience refactor (folds #90 — port + Polly properly attached)
- ED.7 [feature/api] Remove dead REST client after GraphQL migration (folds #123)

### 3.6. Epic E — UX & documentation continuity

**Goal**: UX-долг, который дешевле починить пока маленький; и dot-by-dot документация по changes.

**Children**:
- EE.1 [feature/ui] Settings cleanup (folds #107)
- EE.2 [feature/ui] Style consistency pass (folds #108)
- EE.3 [feature/ui] Unified components audit (folds #109)
- EE.4 [feature/ui] LLM model picker from provider API (folds #104; depends on EC.11 capabilities probe)
- EE.5 [feature/obsidian] Open note from UI (folds #67)
- EE.6 [feature/obsidian] obsidian-gql-migration (folds #66)
- EE.7 [feature/obsidian] Restore Obsidian test coverage (folds #68)
- EE.8 [type/decision, feature/tooling] Roadmap doc — waves: now / next / later (новый файл `docs/roadmap.md`)

### 3.7. Epic F — Operations (Q4=A)

**Goal**: distribution + testing rigor — то, что держит репу production-deployable и регрессионно-устойчивой.

**Children**:
- EF.1 [feature/distribution] Release `.dmg` pipeline (folds #61)
- EF.2 [feature/testing] e2e smoke suite (folds #95)
- EF.3 [feature/testing] Mocks at domain layer, not transport (folds #97)
- EF.4 [feature/testing] Phase exit criteria + grep guards (folds #98)
- EF.5 [feature/testing] Zero known failures policy (folds #99)
- EF.6 [feature/testing] Shipped decisions mandatory (folds #102)
- EF.7 [feature/testing] Drop redundant IDisposable from integration test base (folds #96)
- EF.8 [feature/tooling] Agent no-push policy — documented decision (folds #100)

---

## 4. Классификация всех 63 существующих issue'ов

Колонки: `№` | `disposition` | `target epic / disposition target` | `комментарий`.

Disposition коды (после Q3=C / Q4=A / Q6=archive):
- `K` — keep open + relabel + привязать к эпику через Tasklist
- `F` — fold (закрыть с pointer'ом, content поглощается новым child'ом)
- `C` — close obsolete (без замены)
- `I` — icebox: остаётся open, label `status/icebox`, не привязан к эпику (Q3=C)
- `A` — archive: close как исторический ADR (Q6=archive — old ADR-issues)

| # | Disp | Target | Комментарий |
|---|---|---|---|
| 57 | F | ED.4 | content в новый child под Epic D |
| 58 | F | ED.3 | content в новый child под Epic D |
| 60 | K | Epic D | оставить open, добавить в Tasklist Epic D как существующий child |
| 61 | F | EF.1 | folded into Epic F (Q4=A) |
| 62 | C | — | meeting bot integration → non-goal в новом вижне (live meeting copilot deprioritized) |
| 63 | I | — | aggregated person notes — `status/icebox` |
| 64 | I | — | aggregated topic notes — `status/icebox` |
| 65 | I | — | auto wiki-links — `status/icebox` |
| 66 | F | EE.6 | obsidian-gql-migration — folds в EE.6 |
| 67 | F | EE.5 | open note from UI — folds в EE.5 |
| 68 | F | EE.7 | obsidian test coverage — folds в EE.7 |
| 69 | F | EA.5 / EA.6 | content (privacy posture exception, per-session disable, outbound logging) переезжает в SearXNG-spec |
| 70 | K | Epic D (соседний) | keychain-backed secrets — actual security improvement, остаётся open под `feature/tooling` |
| 71 | C | — | OpenCode-specific MCP discovery UI — мы не строим browse-registry-UI, у нас один MCP сервер |
| 72 | C | — | OpenCode multi-session tabs — OpenCode-specific |
| 73 | C | — | OpenCode native chat UI — OpenCode pivot'нули |
| 74 | C | — | OpenCode per-project settings — OpenCode-specific |
| 75 | C | — | OpenCode server / attach mode — OpenCode-specific |
| 76 | C | — | OpenCode system override — OpenCode-specific |
| 77 | F | ED.2 | EF migrations — folds в ED.2 |
| 78 | K | standalone | profiles glossary autosuggestion — отдельный backlog под `feature/profiles` |
| 79 | K | standalone | multilingual glossary — то же |
| 80 | K | standalone | per-profile LLM override — то же (связан с EC.11 capabilities) |
| 81 | K | EA расширение | periodic aggregated summaries — Pillar 2 расширение, добавить как EA.11 |
| 82 | C | — | reindex on note change — уже работает через `RagIndexingProcessedNoteRepository` декоратор. Закрыть как done. |
| 83 | K | EA расширение | retire BoW fallback — добавить как EA.12 |
| 84 | K | EA расширение | sidecar process-all (latency) — добавить как EA.13 |
| 85 | F | EA.8 | structured corpus queries — content переезжает в Unified search MAF workflow |
| 86 | F | EA.4-EA.7 + privacy ADR | web-aware RAG — content переезжает в SearXNG-bootstrap группу + ADR на privacy |
| 87 | I | — | gigaam-v3 RU STT — `status/icebox` |
| 88 | C | — | grooming live streaming — shipped (#136 + #138) |
| 89 | C | — | live streaming transcription — shipped |
| 90 | F | ED.6 | llm client resilience — folds в ED.6 |
| 91 | I | — | quartz persistent job store — `status/icebox` (multi-node not needed) |
| 92 | I | — | speaker identification — `status/icebox` (V3 long-term) |
| 93 | I | — | sync conflict resolution UI — `status/icebox` (opt-in low priority) |
| 94 | I | — | sync phone pairing validation — `status/icebox` (opt-in low priority) |
| 95 | F | EF.2 | folded into Epic F (Q4=A) |
| 96 | F | EF.7 | folded into Epic F |
| 97 | F | EF.3 | folded into Epic F |
| 98 | F | EF.4 | folded into Epic F |
| 99 | F | EF.5 | folded into Epic F |
| 100 | F | EF.8 | folded into Epic F |
| 101 | C | — | migrate-backlog-to-github-issues — done (всё в issues уже) |
| 102 | F | EF.6 | folded into Epic F |
| 103 | C | — | collapsible sidebar — shipped (Layout.tsx уже использует `useSidebarCollapsed`) |
| 104 | F | EE.4 | LLM model picker — folds в EE.4 |
| 107 | F | EE.1 | settings cleanup — folds в EE.1 |
| 108 | F | EE.2 | style consistency pass — folds в EE.2 |
| 109 | F | EE.3 | unified components — folds в EE.3 |
| 110 | A | — | api-rest-to-graphql — shipped, archive as historical record (Q6) |
| 111 | A | — | ADR-017 metrics — shipped, archive as historical record (Q6) |
| 112 | A | — | ADR-019 obsidian sidecar — Q6=archive: close as historical, reopen as new child if revived |
| 113 | C | — | OpenCode architecture — pivot'нули |
| 114 | C | — | OpenCode provisioning — pivot'нули |
| 115 | C | — | OpenCode pty-ownership — pivot'нули |
| 116 | C | — | OpenCode settings — pivot'нули |
| 117 | A | — | ADR-016 RAG chat history — Q6=archive: close as historical, content к Epic A если revived |
| 118 | A | — | ADR-018 async recording stop — Q6=archive: close as historical, content уже отражён в Принципе 6 transparency |
| 123 | F | ED.7 | remove dead REST client — folds в ED.7 |
| 124 | F | ED.5 | dev-script zombie sidecars — folds в ED.5 (process supervisor) |
| 134 | K | bug, separate track | flaky obsidian-rest test — bug, остаётся open пока не исправлено |
| 137 | K | recording follow-up | refactor StopRecording (созданное мной) — остаётся как `feature/recording` |

### Сводная статистика (после Q3-Q7 finalize)

- **K (keep open + relabel)**: 14 issues (60, 70, 78, 79, 80, 81, 83, 84, 134, 137 + 4 more)
- **F (fold into new child)**: 25 issues (вырос за счёт Q4=A — testing/distribution → Epic F; и за счёт opencode-FOLD'ов на Epic A)
- **C (close as obsolete)**: 12 issues
- **I (icebox + open)**: 8 issues — keep open with `status/icebox` label, не привязаны к эпикам (Q3=C)
- **A (archive — old ADR-issues, close as historical)**: 7 issues (#110, #111, #112, #117, #118 — все)
- **Итого**: 66 (несколько issue'ов попадают в несколько disposition веток — fold + close)

После миграции:
- 14 KEEP'ов остаются open в новом порядке (привязаны к эпикам или standalone)
- 25 FOLD'ов закрываются с pointer'ом на новые children
- 12 CLOSE'ов закрываются как obsolete
- 8 ICEBOX'ов остаются open с `status/icebox`
- 7 ARCHIVE'ов (старые ADR-issues) закрываются как historical record

**Net new issues for creation**: 6 эпиков (Epic 0 + Epic A-F parent-issues) + ~50 children. Минус 25 fold'ов которые поглощают content существующих. Итог: **~30+ new issues** заводится.

---

## 5. Tasklists / зависимости

GitHub Tasklists позволяют parent-issue иметь чек-лист child-issue'ов. Markdown:

```
- [ ] #N1 - title (auto-rendered)
- [ ] #N2
```

Зависимости BETWEEN child'ами (типа «EA.8 depends on EC.2») — выражаются прозой в body issue'ов: `**Depends on:** #EC.2`. GitHub не имеет нативной dependency-функции (только Tasklist parent→child).

Tasklist в каждом эпике parent'е = чек-лист всех children. По мере выполнения отмечается. Owner видит прогресс эпика на одном glance.

---

## 6. Sequencing миграции (предлагаемый порядок выполнения)

Когда дойдём до фактической миграции (после approval'а этого плана):

1. **PR с `docs/product-vision-2026-04.md` + `docs/issues-migration-plan.md`** — merge before any issue change.
2. **PR с расширением `.github/ISSUE_TEMPLATE/*.yml`** — новые feature-опции в dropdown'ах.
3. **Создать parent-issue Epic 0** «Vision foundations 2026-04» — Tasklist с E0.1, E0.2, E0.3.
4. **Создать parent-issues Epic A-E** — каждый с пустым Tasklist (children заводятся следующим шагом).
5. **Завести children по эпикам** — поочерёдно, привязывая через Tasklist parent'а.
6. **Spring-cleaning**: пройтись по списку из секции 4 — закрыть C/F/I, перевешать labels у K, привязать существующих children'ов к Tasklist'ам соответствующих parent'ов.
7. **Проверочный проход**: `gh issue list --state open --limit 100` сравнить с ожиданием.

Все операции через `gh` CLI с PAT, можно скриптом обернуть.

---

## 7. Open questions / спорные моменты миграции

1. **`status/icebox` label — заводить или нет?** Альтернатива: просто закрывать ICEBOX'ы. Pro icebox: видно что было рассмотрено; Con: 8 issue'ов остаются open и шумят.
2. **Distribution issue (#61) и testing-стек — куда привязать?** Сейчас они standalone. Можно завести **Epic F: Operations** (CI / distribution / e2e) для них. Решение откладывается.
3. **ADR-016 (#117), ADR-017 (#111), ADR-018 (#118), ADR-019 (#112)** — оставлять как есть в issue'ах или конвертить в `docs/`-файлы? Решение: **оставляем в issues** (per текущий convention `ADR-as-issue`). Body этого вижна это явно фиксирует.
4. **Migration-script автомат?** Можно написать `scripts/migrate-issues-2026-04.sh` (по аналогии с существующим `migrate-docs-to-issues.sh`) для воспроизводимости. Оверкилл для one-shot или нет — решение тебя.
5. **Epic 0 завершить ДО Epic A-E или параллельно?** Логически сначала (label taxonomy + spring-cleaning должны быть до привязки children'ов), но technically parent-issue Epic A-E можно создать уже сейчас, children приходят потом.
6. **Что делать с `Epic 0 → E0.3 spring-cleaning` сам собой**: одна задача-зонтик или 63 sub-task'а? Предлагаю: один issue с теми же 4 секциями (KEEP / FOLD / CLOSE / ICEBOX) и checkbox'ами в body. Не плодить шум.
7. **Закрытые/already-shipped issue'ы (#88 #89 #103 #110 #111)** — закрывать с label `status/shipped` явно, или комментарием в issue достаточно? GitHub close + comment — стандарт.

---

## 8. Ожидаемые артефакты после полного цикла

- 1 PR в репе со всеми doc-файлами (vision-2026-04, migration-plan, обновлённые `AGENTS.md` per слой при необходимости).
- 1 PR с `.github/ISSUE_TEMPLATE/*.yml` обновлениями.
- 5 parent-issue'ов (Epic 0 + Epic A-E) с tasklists.
- ~30 новых child-issue'ов под эпиками.
- ~13 закрытых старых obsolete issue'ов с pointer'ами.
- ~17 закрытых fold'ов с pointer'ами на новые child'ы.
- ~8 icebox'нутых.
- 25 существующих open-issue'ов, перепривязанных к эпикам через Tasklist'ы.

---

## 9. Что осталось обсудить с владельцем

Перед началом миграции:

- **Q1.** Окей классификация всех 63 issue'ов в секции 4? Где-то disposition должен быть другой?
- **Q2.** Окей структура эпиков (5 шт.) в секции 3, или нужна другая разбивка?
- **Q3.** Заводим `status/icebox` label или закрываем ICEBOX'ы?
- **Q4.** Distribution + testing-стек — отдельный Epic F: Operations или standalone?
- **Q5.** Migration-script (автомат) или ручной gh CLI?
- **Q6.** Старые ADR-issue'ы (#111/112/117/118) — keep as-is или конвертить в файлы под `docs/adr/`?

Когда Q1-Q6 закрыты — миграция запускается.