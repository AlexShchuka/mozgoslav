# ADR-005: Local RAG — AI Q&A over notes and transcripts

- **Status:** Proposed — **future iteration, не для текущего launch MR**
- **Date:** 2026-04-16
- **Related:** ADR-002 (Dictation), ADR-003 (Syncthing)

## Context

После того как mozgoslav собирает месяц-другой транскриптов и заметок, возникает естественный вопрос: «о чём я договаривался с X в прошлый вторник?», «какие action items остались у команды за квартал?», «что обсуждали про проект Y?». Listing + wiki-links не масштабируется — нужен **полу-разговорный ответ с цитатами из собственных заметок**.

Это классический RAG (retrieval-augmented generation): эмбеддинги поверх своих данных + LLM отвечает, ссылаясь на источники. У конкурентов — Mem, Reflect, Rewind. В privacy-first мире — **строго локально**, без облаков.

## Decision (draft)

### D1. Embeddings — local

- **Embedding модель:** добавить в существующий `ModelCatalog` новый `Kind = Embeddings`. Кандидаты: `intfloat/multilingual-e5-large` (1.4 GB, multilingual incl. RU), `BAAI/bge-m3` (2 GB, топ multilingual). Выбор — отдельный под-ADR / в ходе реализации.
- **Запуск эмбеддингов:** через существующий python-sidecar (переиспользуем ML-слой). FastAPI endpoint `POST /v3/embed {texts: string[]}` → `float[][]`.

### D2. Vector store — SQLite-native

- **sqlite-vss** или **sqlite-vec** — векторный индекс прямо в существующей SQLite базе `settings.db` (или отдельном `embeddings.db`). Без новой инфраструктуры. `vector<384..1024>` поля + HNSW/cosine.
- Почему не Qdrant/Weaviate: отдельный процесс, лишняя инфраструктура, пропадает «zero-setup».

### D3. Indexing pipeline

- Новый `EmbeddingIndexerService` в `Mozgoslav.Application`:
  - Источники: `ProcessedNote`, `Transcript.Segments`.
  - Chunk: ~500 токенов с overlap 50.
  - Event-driven: при создании/обновлении `ProcessedNote` → enqueue embedding job через существующий `IProcessingJobRepository` + новый `JobType = Embed`.
  - Реиспользует `QueueBackgroundService` паттерн для фоновой обработки.

### D4. Query pipeline

- Новый endpoint `POST /api/search/ask { query: string, topK?: 10 }`:
  1. Эмбеддинг query через sidecar.
  2. Vector search в SQLite → top-K chunks.
  3. Prompt в `ILlmService`: «Ответь на вопрос используя только эти источники. Цитируй в формате [1], [2] ссылаясь на источники внизу».
  4. Возврат: `{ answer: string, citations: [{ noteId, segmentId, text, snippet }] }`.
- Streaming response через SSE для live-UX.

### D5. UI — НЕ добавляем в MVP текущей итерации

- При реализации — добавить command palette entry `? Ask your notes`. Открывает модалку с query + streaming ответ + clickable citations.
- `docs/adr/README.md` + Settings — в этом ADR не правим.

## Consequences

### Положительные
- Убивает usecase Mem/Reflect локально.
- Реиспользует SQLite, Python sidecar, QueueBackgroundService, ILlmService — минимум новой инфраструктуры.
- Privacy-first: всё локально, включая embeddings.

### Отрицательные
- +1.5-2 GB модель для embeddings (user скачивает при первом включении фичи, как сейчас Whisper).
- Re-indexing при смене embedding-модели — долго (часы на большую базу).
- Качество RAG зависит от модели embedding — для RU нужен multilingual, не английский-only.

### Out of scope для этого ADR
- Fine-tuning embedding-модели на собственных данных.
- Multi-hop reasoning (цепочки рассуждений через несколько документов).
- Time-based ranking (последние — важнее старых).

## Alternatives considered

- **Qdrant standalone** — overkill, лишний процесс.
- **Full-text search only (FTS5)** — отдельная фича в `docs/roadmap.md`, дополняет RAG, не заменяет.
- **OpenAI embeddings через `ILlmService`** — отвергнуто: privacy-first, эмбеддинги уходят наружу = содержимое заметок.

## Implementation plan (future, отдельная итерация)

- Phase 1: add `Embeddings` kind в ModelCatalog + python-sidecar endpoint.
- Phase 2: SQLite vector extension integration.
- Phase 3: Indexer + reindex command.
- Phase 4: Search endpoint + prompt engineering.
- Phase 5: Command palette integration (когда будет general UI pass).

## References
- [sqlite-vec — vector search в SQLite](https://github.com/asg017/sqlite-vec)
- [sqlite-vss (альтернатива)](https://github.com/asg017/sqlite-vss)
- [multilingual-e5-large](https://huggingface.co/intfloat/multilingual-e5-large)
- [BAAI/bge-m3](https://huggingface.co/BAAI/bge-m3)
