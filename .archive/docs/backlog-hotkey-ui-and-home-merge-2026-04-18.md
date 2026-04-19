# hotkey-ui-and-home-merge — NEXT snapshot 2026-04-18

> Archived on 2026-04-18. Second NEXT iteration on branch
> `shuka/next-queue-2026-04-18`. Both items shipped:
>
> - H1 — push-to-talk via native Swift helper + SSE bus (commit
    > `75c38a6`). UNVERIFIED ON MAC — compiles, wires end-to-end on
    > Linux sandbox, but the AppKit `addGlobalMonitorForEvents` path
    > requires a real macOS run to confirm.
> - L1 — Queue + Dashboard merged into a single "Мозгослав" home page
    > (commit `84f209b`).
>
> Previous snapshot (the one before this iteration): see
> `.archive/docs/backlog-try-ready-to-prod-2026-04-18.md`.

---

# NEXT — активная очередь работы

- **Status:** Active queue. Пункт выполнили → удалили из файла.
- **Date:** 2026-04-18
- **Scope:** only что-то реализуем прямо сейчас или в ближайшей итерации. Backlog (то, что отложено) —
  `ADR-014-unrealized-backlog.md`. Post-v1.0 production — `POSTRELEASE.md`. Новые архитектурные решения — `ADR-016`,
  `ADR-017`.
- **Prev snapshot (shipped):** `.archive/docs/backlog-try-ready-to-prod-2026-04-18.md` (D1/D2/D3/D4/F1/G2/T3/U1/U2
  закрыты; U3 ушла в ADR-014; follow-ups #12a, #13, #14, #15, #17, #18, #19 тоже закрыты в той же ветке).

## Critical — блокирует релиз / деградация основного флоу

## Quick wins — дёшево и сейчас

### H1 — Push-to-talk semantics для глобального хоткея диктовки

**Симптом:** сейчас глобальный хоткей — toggle (нажал → старт, нажал второй раз → стоп). Пользователь хочет
press-and-hold: удерживаешь → пишется, отпустил → стоп + вставка текста.

**Почему так сейчас:** Electron `globalShortcut.register(accelerator, cb)` вызывает callback только на keydown, keyup не
отдаёт. Поэтому нативно toggle — единственное что работает без дополнительной инфраструктуры.

**Что делать:**

1. Задействовать нативный `MozgoslavDictationHelper` (Swift) для глобального keyboard monitor — он уже живёт в
   приложении и имеет XPC-канал. Подписаться на `CGEventTapCreate`/`NSEvent.addGlobalMonitorForEvents(.keyDown/.keyUp)`
   для нужного хоткея (accessibility permission уже требуется для текст-инъекции → никаких доп. prompts для
   пользователя).
2. Helper шлёт на backend два события: `hotkey.press` (keydown нужной комбинации) и `hotkey.release` (keyup).
3. Backend проксирует через SSE в Electron main → main запускает/останавливает `DictationOrchestrator`.
4. Electron `globalShortcut` остаётся fallback-ом для платформ без helper'а (Linux/Windows) — там остаётся toggle.
5. UI в Settings (после #10 H0): чекбокс «Удерживать для записи» рядом с полем hotkey.

**Оценка:** M-L, пол-дня до 1 дня. Swift-сторона непроверяема в Linux-сандбоксе — UNVERIFIED ON MAC до прогона на машине
shuka.

**Зависит от:** H0 (#10) — UI хоткея уже должен уметь сохранять custom accelerator, иначе push-to-talk привязан к
хардкоду.

### L1 — Объединение Queue + Dashboard в одну страницу «Мозгослав»

**Симптом:** Dashboard (запись / recent recordings / быстрые действия) и Queue (processing jobs с прогрессом /
finished / failed) — два отдельных роута и два пункта в сайдбаре. Операционно это один экран: пользователь записывает →
сразу видит что сейчас в обработке → видит результат. Разделение добавляет клики без пользы.

**Что делать:**

- Новая страница/роут: `/home` (или `/`) под именем «Мозгослав» (ru) / «Home» (en) — объединяет оба флоу:
    - Верхняя секция: record controls (из Dashboard).
    - Средняя: recent recordings compact list.
    - Нижняя: live queue stream — активные jobs с прогресс-баром, completed с ссылками на notes, failed с retry.
- Убрать роуты `/` (dashboard) и `/queue` (редирект на `/home` для обратной совместимости deep-link'ов).
- Sidebar: один пункт «Мозгослав» вместо двух. Icon — либо Home, либо совмещённый (Activity).
- Reuse: `AudioLevelMeter` (live meter из D2), `ModelDownloadProgress` (не нужен тут, но компонент-паттерн),
  styled-components tokens из `theme.ts`.
- Solidарность с #16 архивной: layout — vertical stack; split panes — в backlog.

**Оценка:** M, ~пол-дня. Чисто фронт-работа, бэкенд не трогаем.

**Зависит от:** ничего. Можно делать параллельно с H1.

## Как работать с этим файлом

- Делаем пункт → удаляем отсюда. Краткое описание shipped версии попадёт в `README.md` / `CLAUDE.md`.
- Открыли новый блокер / появился reactive bug → добавляем сюда с секцией `Critical`.
- Пункт забуксовал / стал не приоритетен → переместить в `ADR-014-unrealized-backlog.md` в соответствующий раздел.
