# ADR-016 — RAG chat history persistence

- **Status:** Proposed
- **Date:** 2026-04-18
- **Priority:** Low (одобрено, но не в near-term очереди)

## Контекст

`IRagService` сейчас отвечает на вопрос одним shot'ом: `POST /api/rag/query { question, topK }` → `answer + citations`. История разговора с RAG живёт только в памяти React-стейта `slices/rag` в одной сессии Electron-процесса — перезапуск приложения съедает контекст.

Следствие:
- Пользователь задаёт follow-up «а откуда эта цитата?» → LLM не знает предыдущий ответ.
- Начинаем заново каждый boot → теряется «продолженное исследование» поверх собственных заметок.
- Multi-turn rag (когда ответ строится по нескольким последовательным вопросам с накапливающимся контекстом) — технически невозможен.

## Решение (предлагается)

Ввести доменную сущность `RagConversation` + `RagMessage`.

### Схема данных

Новая EF Core миграция добавляет две таблицы:

```sql
CREATE TABLE rag_conversations (
    id            TEXT PRIMARY KEY,
    title         TEXT NOT NULL,          -- первый вопрос или user-override
    created_at    TEXT NOT NULL,
    updated_at    TEXT NOT NULL
);

CREATE TABLE rag_messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES rag_conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL,        -- 'user' | 'assistant'
    content         TEXT NOT NULL,
    citations_json  TEXT,                 -- JSON массив { noteId, chunkId, score } для assistant
    created_at      TEXT NOT NULL
);
CREATE INDEX IX_rag_messages_conversation_id ON rag_messages(conversation_id);
```

### API

- `GET /api/rag/conversations` — список (id, title, updatedAt), отсортированный по updatedAt desc.
- `GET /api/rag/conversations/{id}` — конкретная беседа со всеми messages.
- `POST /api/rag/conversations` `{ title? }` — создать пустую.
- `POST /api/rag/conversations/{id}/query` `{ question, topK? }` — добавить user-message + assistant-message, вернуть обе.
- `DELETE /api/rag/conversations/{id}` — удалить + каскадно messages.

Существующий `POST /api/rag/query` сохранить — «быстрый one-shot без записи».

### Пайплайн запроса

`RagService.QueryAsync(conversationId, question)`:
1. Загрузить последние N messages (start: N=8) из conversation.
2. Сформировать LLM-prompt: `system` + `history` + `retrieved chunks` + текущий `question`.
3. Получить ответ, сохранить user+assistant messages в БД.
4. Обновить `updated_at` конверсации.

### Frontend

`slices/rag` расширяется: `conversations: Record<id, Conversation>`, `activeConversationId`. UI — sidebar-lite со списком бесед на странице RAG, выбор → подгружает полную историю через `GET /conversations/{id}`.

## Альтернативы (отвергнуты)

- **localStorage вместо БД.** Отпадает: юзер ожидает, что данные живут там же где его заметки (SQLite), а не растворяются при Electron-cache cleanup.
- **Плоский log без понятия «беседа».** Хуже UX — нет разделения на темы. Одна таблица с implicit-grouping by date — прекращает работать как только юзер параллельно ведёт две ветки обсуждения.
- **Сохранять только вопрос+ответ без чанков.** Citations нужны для «откуда взялось» — без них follow-up теряет ground-truth.

## Последствия

**Плюсы:**
- Multi-turn RAG: «а из какой ноты это?» работает.
- Persistence: перезапуск не убивает контекст.
- Audit trail: юзер видит что уже спрашивал.

**Минусы:**
- Две новые таблицы + миграция.
- LLM-prompt растёт (история добавляется) → tokens → cost/latency. Смягчение: brownout по N=8 последних messages, summarisation старого контекста через `OpenAiCompatibleLlmService.Chunk/Merge` при длинных беседах (re-use existing pipeline).

## Зависимости

- Нет блокеров. Делается в любой момент после мержа текущей PR #9.

## Оценка

M, 1-1.5 дня:
- 0.5 д — миграция + domain entities + repositories + unit tests.
- 0.5 д — endpoint + pipeline RagService обновлённый.
- 0.3 д — frontend slice + conversation-list UI + query wiring.
