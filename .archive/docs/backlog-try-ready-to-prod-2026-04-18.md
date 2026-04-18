# try-ready-to-prod — NEXT snapshot 2026-04-18

> Archived on 2026-04-18. This snapshot captures the "NEXT" backlog as it
> stood right before the Try → Ready-to-prod iteration kicked off. Every
> item from this list shipped on `shuka/next-queue-2026-04-18`:
>
> - D4 (long-running ffmpeg per session — critical dictation blocker)
> - D1 (Swift single-tap + AVAudioFile flush + handoff logging) — UNVERIFIED ON MAC
> - D2 (live audio level meters on Dashboard)
> - D3 (hot-plug microphone handling) — UNVERIFIED ON MAC
> - F1 (models/ → domain/ dedup)
> - G2 (sentence-transformer default, BoW fallback)
> - T3 (speaker-aware transcript formatting)
> - U1 (sample-audio try-it button)
> - U2 (CommandPalette kbar styling)
> - U3 (EmptyState illustrations) — moved to ADR-014 (no designer)
>
> The NEXT file was trimmed empty at the end of that iteration; see the new
> `docs/adr/NEXT.md` for the current queue.

---

# NEXT — активная очередь работы

- **Status:** Active queue. Пункт выполнили → удалили из файла.
- **Date:** 2026-04-18
- **Scope:** only что-то реализуем прямо сейчас или в ближайшей итерации. Backlog (то, что отложено) — `ADR-014-unrealized-backlog.md`. Post-v1.0 production — `POSTRELEASE.md`. Новые архитектурные решения — `ADR-016`, `ADR-017`.

Очередь пуста на 2026-04-18; добавляйте новые пункты сюда.

## Critical — блокирует релиз / деградация основного флоу

## Quick wins — дёшево и сейчас

## Как работать с этим файлом

- Делаем пункт → удаляем отсюда. Краткое описание shipped версии попадёт в `README.md` / `CLAUDE.md`.
- Открыли новый блокер / появился reactive bug → добавляем сюда с секцией `Critical`.
- Пункт забуксовал / стал не приоритетен → переместить в `ADR-014-unrealized-backlog.md` в соответствующий раздел.
