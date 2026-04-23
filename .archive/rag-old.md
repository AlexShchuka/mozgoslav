# ADR-XXX — RAG груминг (2026-04-23)

## Контекст

RAG реализован на уровне Application/Rag/ и Infrastructure/Rag/, подключён через `POST /api/rag/{query, reindex}`. Фронтенд имеет слайс `slices/rag` + компонент RagChat (помечен как WIP).
ADR-016 предлагает добавить персистентность чатов и multi-turn RAG — это отдельная задача, не входящая в этот груминг.

## Что работает сейчас

| Компонент | Статус |
|-----------|--------|
| `NoteChunker.Chunk()` — параграфный чанкер (800 символов) | ✅ реализован, детерминированный |
| `IEmbeddingService` + `BagOfWordsEmbeddingService` (256 dim) | ✅ MVP fallback |
| `PythonSidecarEmbeddingService` (384 dim, graceful degradation) | ✅ production-путь |
| `InMemoryVectorIndex` — ConcurrentDictionary, cosine similarity | ✅ development-путь |
| `SqliteVectorIndex` — lazy init, BLOB-сериализация, brute-force search | ⚠️ работает, но есть проблемы (см. ниже) |
| `IRagService.IndexAsync/AnswerAsync` | ✅ оркестрация пайплайна |
| `POST /api/rag/query { question, topK } → answer + citations[]` | ✅ endpoint готов |
| `POST /api/rag/reindex` — переиндексация всех нот | ⚠️ работает вручную |
| Redux slice: ASK_QUESTION → ASK_PENDING → ASK_SUCCESS/FAILURE | ✅ |
| RagChat UI (WIP badge, citations, typing dots) | ✅ компонент + тесты |

## Критические проблемы

### 1. Таблица `rag_chunks` не создаётся миграцией EF Core

Таблица создаётся «лениво» внутри `SqliteVectorIndex.EnsureSchema()` при первом обращении к методу. Она **не входит в** `MozgoslavDbContext.OnModelCreating`, поэтому:
- нет версии миграции в `__EFMigrationsHistory`
- нельзя удалить/пересоздать таблицу через EF Core pipeline
- при ручном удалении БД (dev-бокс) таблица восстанавливается только после первого вызова rag-endpoint

**Рекомендация:** добавить `DbSet<RagChunk>` в DbContext + миграцию, убрав lazy-init из SqliteVectorIndex. Это приведёт RAG к стандарту EF Core, как это сделано с профилями и настройками.

### 2. SqliteVectorIndex.DisposeAsync() никогда не вызывается

`SqliteVectorIndex : IAsyncDisposable` объявлен в Program.cs через `AddSingleton<IVectorIndex>` — но DI-контейнер в Minimal API **не вызывает DisposeAsync** на синглтонах. SemaphoneSlim `_mutex` утекает, и при перезапуске процесса (перезапуск приложения) индексы теряются без уведомления (что допустимо для dev, но не для production).

### 3. Ручная реиндексация — единственный способ заполнить индекс

Нет автоматической переиндексации:
- при старте `DatabaseInitializer` применяет миграции, сеедит профили — но **не трогает RAG**
- при создании/модификации ноты нет хука на вызов `rag.IndexAsync(note)`
- пользователь не видит индикатора «индекс пуст» или «нужна переиндексация»

**Следствие:** если юзер добавил записи в БД и сделал query — он получает пустой ответ без объяснения почему. Единственный путь — вручную вызвать `/api/rag/reindex` через DevTools.

### 4. RagReindexResult не совпадает с API response shape

```csharp
// Backend (RagEndpoints.cs:48)
return Results.Ok(new { embeddedNotes = allNotes.Count, chunks = index.Count });

// Frontend (RagApi.ts:5)
public interface RagReindexResult { readonly indexed: number; }
```

Фронтенд ожидает `{ indexed }`, бэкенд возвращает `{ embeddedNotes, chunks }`. Если фронтенд использует это значение — он получит `undefined`.

### 5. ADR-016 не реализован (пропущено)

Согласно документации:
- Персистентность чатов (`RagConversation` + `RagMessage`) — **отсутствует**
- Multi-turn RAG с историей — **невозможен**
- Эндпоинт `/api/rag/conversations/{id}/query` — **не существует**
- Список бесед (`GET /api/rag/conversations`) — **не существует**

Фронтенд хранит `messages[]` в Redux state → сбрасывается при перезапуске Electron.

## Нюансы реализации

### SqliteVectorIndex: brute-force search на каждой итерации
Метод `SearchAsync` читает ВСЕ строки из таблицы (`SELECT ... FROM rag_chunks`) и считает cosine similarity в C#. При ~10k чанков (пару тысяч заметок) это ~50ms — нормально. Но нет индекса по `embedding` column, потому что SQLite не умеет хранить BLOB-индексы для косинуса без extensiion (`sqlite-vss`).

### Утечка `_initialised = true` в SqliteVectorIndex
Флаг инициализации статический (instance field), но `_mutex` — тоже instance. После `Dispose()` и повторного использования (если бы такое было) флаг сбросится некорректно. В текущем виде (синглтон, без dispose) это безопасно.

### InMemoryVectorIndex: _mutex отсутствует
Методы используют `ConcurrentDictionary`, но `SearchAsync` делает `_chunks.Values.ToArray()` — это snapshot, безопасный для concurrent reads. Однако `RemoveByNoteAsync` проходит по всем ключам и вызывает `TryRemove` — может быть медленным при большом количестве чанков (но в dev это не проблема).

### Embedding dimension mismatch
Если пользователь переключается с BoW (256 dim) на sidecar (384 dim) без очистки индекса:
- `SqliteVectorIndex.SearchAsync` фильтрует по `dimensions != queryEmbedding.Length` — безопасно, чанки старой размерности пропускаются
- Но старые чанки остаются «в мусоре» в БД и никогда не удаляются (только через реиндексацию ноты)

## Рекомендации к реализации (по приоритету)

1. **[HIGH]** Добавить хук на `rag.IndexAsync` при создании/обновлении ProcessedNote — авто-индексация, а не ручная кнопка
2. **[HIGH]** Статус-бар RAG в UI: «нет индекса» / «N чанков проиндексировано» / «переиндексировать»
3. **[MEDIUM]** Исправить `RagReindexResult` — согласовать shape с бэкендом (включая `chunks`)
4. **[MEDIUM]** Перенести создание таблицы `rag_chunks` из lazy-init в EF Core миграцию (ADR-016 также требует таблицу `rag_conversations` — объединить их в одну migration)
5. **[LOW]** Убрать WIP-badge с RagChat, когда всё готово
6. **[NICE]** Добавить логирование при запуске: «RAG index loaded, {n} chunks» / «RAG not initialized (persist=false)»

## Связанные задачи

- ADR-016 — чат-персистентность и multi-turn RAG (отдельная задача, low priority, не в near-term очереди)
- ADR-005 — исходный дизайн RAG (в `.archive/adrs/`)
- ADR-007-shared §2.4 — contract для Python sidecar `/api/embed`
