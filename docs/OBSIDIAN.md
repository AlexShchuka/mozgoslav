# OBSIDIAN — анализ интеграции

## 1. Архитектура

Интеграция с Obsidian реализуется **двумя независимыми путями**:

### Путь A: прямой файловый экспорт (основной)
```
ProcessedNote → IMarkdownExporter.ExportAsync() → VaultPath/*.md
```
Бэкенд сам пишет markdown-файлы в директорию vault, которую юзер задал через Settings. Никакого плагина Obsidian не нужно.

**Компоненты:**
| Файл | Роль |
|------|------|
| `ObsidianSetupService.cs` (108 строк) | Создаёт папки `_inbox`, `People`, `Projects`, `Topics`, `Templates` + шаблон Templater-ноты в `Templates/Mozgoslav Conversation.md` |
| `ObsidianBulkExportService.cs` (106 строк) | Итерирует все `ProcessedNote` с `ExportedToVault == false`, вызывает `IMarkdownExporter`, помечает как экспортированные |
| `ObsidianLayoutService.cs` (77 строк) | Создаёт PARA-папки (`Projects`, `Areas`, `Resources`, `Archive`) — **movedNotes всегда 0** (ADR-007 phase 2 не реализован) |

### Путь B: Obsidian Local REST API Plugin
```
POST /api/obsidian/open → OpenNoteAsync() → plugin "open/<path>"
PUT    /vault/<path>       → EnsureFolderAsync() → plugin "vault/<path>"
GET    /                   → GetVaultInfoAsync()  → plugin root info
```
Для открытия нот в открытом приложении Obsidian и создания папок. Требует плагин [Obsidian Local REST API](https://github.com/remotemethod/obsidian-local-rest-api) (или аналогичный).

**Компоненты:**
| Файл | Роль |
|------|------|
| `ObsidianRestApiClient.cs` (149 строк) | HTTP-клиент к плагину, использует `Mozgoslav.Obsidian` named HttpClient с self-signed cert callback |
| Endpoints: `/api/obsidian/rest-health`, `/api/obsidian/open` | Фоллбэк на файловый I/O если REST недоступен |

### Синхронизация (Syncthing) — отдельный слой
```
Desktop vault → Syncthing → Android/iOS
  ├── mozgoslav-recordings
  ├── mozgoslav-notes
  └── mozgoslav-obsidian-vault (опционально)
```
[Документ](docs/sync-mobile-setup.md) — полная инструкция по парингу.

---

## 2. Текущее состояние

| Компонент | Статус | Примечания |
|-----------|--------|------------|
| **Файловый экспорт (BulkExport)** | ⚠️ Частично сломан | Один интеграционный тест падает: `Post_ExportAll_NoVaultConfigured_ReturnsBadRequest` — эндпоинт возвращает 200 вместо BadRequest при пустом vault path |
| **Setup** | ✅ Работает | Создаёт папки + шаблон Templater-ноты |
| **PARA Layout** | ⚠️ Заглушка | `movedNotes` всегда 0. Реальное перемещение нот по PARA требует `FolderMapping` + `VaultExportRule` из ADR-007 phase 2 |
| **REST API plugin** | ✅ Работает (если установлен) | Health-check, open note, create folder |
| **Фронтенд UI (Obsidian tab)** | ✅ Работает | 4 теста проходят, компонент показывает setup + bulk export |
| **Тесты фронтенда** | ✅ Все 14 проходят | — |
| **Синхронизация с телефоном** | ⚠️ Не протестирована end-to-end | ADR-014 S1: "живого прогона с реальным phone не было" |
| **Шаблон Templater** | ✅ Есть файл | `Templates/Mozgoslav Conversation.md` — содержит `<% tp.system.prompt("Profile") %>` и другие Templater-конструкции. Но плагин Templater нужно ставить вручную в Obsidian |

### Шаблон ноты (встроено)
```yaml
---
type: conversation
profile: <% tp.system.prompt("Profile") %>
date: <% tp.date.now("YYYY-MM-DD") %>
...
---
## Summary, ## Ключевые тезисы, ## Решения, ...
```

### .stignore для Syncthing (встроено)
Правила игнорирования `.DS_Store`, workspace-файлов Obsidian, `node_modules` и т.д. — готовый шаблон в `SyncthingFolderInitializer.cs`.

---

## 3. Найдённые проблемы

### 🔴 Критическая: падает тест на экспорт без vault
```
Не пройден Post_ExportAll_NoVaultConfigured_ReturnsBadRequest [968 ms]
```
В `ObsidianEndpoints.cs` линия 50-63 — эндпоинт делает `service.ExportAllUnexportedAsync()` который бросает `InvalidOperationException` при пустом VaultPath, и он должен вернуть BadRequest. Тест ожидает это, но что-то не сработало (возможно, сервис не получает настроенные settings в контексте теста).

Нужно запустить тест с verbose-output чтобы увидеть ассерт:
```bash
cd backend && dotnet test --filter "Post_ExportAll_NoVaultConfigured" -v detailed 2>&1 | grep -A5 'Assert\|Exception'
```

### 🟡 Средние
1. **`movedNotes` всегда 0** — `ObsidianLayoutService.cs:76`: возвращает `MovedNotes: 0`. Реальное перемещение нот в PARA-папки требует рефакторинга ADR-007 phase 2, который ещё не реализован.
2. **Только один шаблон** — нет динамической генерации шаблонов для разных профилей обработки (рабочий/неформальный).
3. **Нет авто-иморта из Obsidian** — система может экспортировать *в* Obsidian, но не может импортировать изменения, сделанные в самой Obsidian (кроме Syncthing sync).

### 🟢 Низкие приоритеты
1. Шаблон Templater требует ручной установки плагина в Obsidian
2. REST API plugin — стороннее решение, нет гарантии стабильности API
3. `Preload.ts` whitelist (из CLAUDE.md) — нет экшена на открытие Obsidian через bridge

---

## 4. Как это выглядит для пользователя (workflow)

```
1. Настройка Obsidian:
   Settings → Obsidian → выбрать папку Vault
   Нажать "Apply Setup" → создаются папки + шаблон

2. Экспорт нот:
   Нажмите "Sync All" → POST /api/obsidian/export-all
   Notes с ExportedToVault=false экспортируются в vault/*.md

3. Открытие заметки:
   В UI notes → нажать note → POST /api/obsidian/open/{path}
   Открывается через REST API (если плагин есть) или Finder (fallback)

4. Мобильная синхронизация (опционально):
   Настройки → Sync → QR-код для паринга телефона
```

---

## 5. Рекомендации по "лёгкой" интеграции

### Что уже лёгкое ✅
- **Файловый экспорт** — уже максимально простое решение, no plugins required
- Шаблон ноты — один Markdown-файл в папке Templates (Obsidian распознает автоматически)
- .stignore — встроенный шаблон для Syncthing

### Что можно упростить или улучшить
1. **Убрать REST API plugin** если он не нужен — файловый экспорт и открытие через Finder покрывают 95% use-case'ов. Это уменьшит зависимости и сложность setup.
2. **Templater-шаблон** — достаточно одного файла, ничего не нужно настраивать. Obsidian покажет "Convert to template" автоматически при создании папки Templates.
3. **PARA Layout** — сейчас только создаёт папки без перемещения нот. Можно заменить на скрипт (например, Python или shell), который сам раскидает ноты по PARA-папкам один раз.

### Что стоит добавить для полной интеграции
1. **Авто-обнаружение vault path** — эндпоинт `/api/obsidian/detect` уже есть и работает! Проверяет `~/Documents/Obsidian Vault`, `~/Obsidian`, `~/Documents/Obsidian`.
2. **Импорт изменений из Obsidian** — валидация `.md` файлов, которые появились в vault после экспорта (diff по дате/хешу).
3. **Профили Templater** — шаблоны для "Рабочего", "Неформального" и т.д.

---

## 6. Расположение ключевых файлов

```
backend/src/Mozgoslav.Infrastructure/Services/
├── ObsidianSetupService.cs          ← настройка vault (папки + шаблон)
├── ObsidianBulkExportService.cs     ← экспорт всех нот в vault
├── ObsidianLayoutService.cs         ← PARA layout (заглушка)
└── SyncthingFolderInitializer.cs    ← .stignore для синхронизации

backend/src/Mozgoslav.Api/Endpoints/
└── ObsidianEndpoints.cs             ← REST endpoints

frontend/src/features/Obsidian/
├── Obsidian.tsx                     ← UI-компонент (163 строки)
├── Obsidian.container.ts            ← Redux connect
└── types.ts                         ← TypeScript interfaces

frontend/src/store/slices/obsidian/
├── actions.ts                       ← CRUD actions
├── reducer.ts                       ← state management
├── saga/bulkExportSaga.ts           ← bulk export flow
├── saga/setupObsidianSaga.ts        ← setup flow
└── saga/applyLayoutSaga.ts          ← layout application
```
