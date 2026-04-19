# Contributing to Mozgoslav

Эта страница для разработчиков. Если ты обычный пользователь — `README.md`.

## Требования

| Компонент                   | Версия                                                                                       | Где                                                        |
|-----------------------------|----------------------------------------------------------------------------------------------|------------------------------------------------------------|
| macOS                       | 14+ (Apple Silicon) для DMG-сборки и CoreML; Linux подходит для разработки backend / sidecar | —                                                          |
| .NET SDK                    | **10.0+**                                                                                    | https://dotnet.microsoft.com/download                      |
| Node.js                     | 24+ (минимум 20)                                                                             | https://nodejs.org                                         |
| Python                      | 3.11+ (3.12 recommended)                                                                     | https://python.org                                         |
| JetBrains Rider или VS Code | любая актуальная                                                                             | https://jetbrains.com/rider                                |
| ffmpeg                      | любая                                                                                        | `brew install ffmpeg` (mac) / `apt install ffmpeg` (linux) |

## Быстрый старт в Rider

1. Открой `backend/Mozgoslav.sln` в Rider. Запусти профиль **Mozgoslav.Api** — бэк поднимется на http://localhost:5050.
2. В другой вкладке:
   ```bash
   cd frontend
   npm install
   npm run dev              # Electron-окно откроется автоматически
   ```
3. python-sidecar:
   ```bash
   cd python-sidecar
   python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt -r requirements-dev.txt
   uvicorn app.main:app --host 127.0.0.1 --port 5060 --reload
   ```

## Из терминала

```bash
cd backend && dotnet run --project src/Mozgoslav.Api -maxcpucount:1
# в другой вкладке
cd frontend && npm install && npm run dev
```

Сборка `.dmg` (только macOS):

```bash
cd frontend && npm run dist:mac
```

## Тесты

```bash
# backend (используй -maxcpucount:1 в любых dotnet-командах)
cd backend && dotnet test Mozgoslav.sln -maxcpucount:1

# python-sidecar
cd python-sidecar && source .venv/bin/activate && pytest

# frontend
cd frontend && npm test -- --watchAll=false
```

## Lefthook (pre-commit)

1. Установи lefthook один раз:
   ```bash
   # macOS
   brew install lefthook
   # Linux
   curl -sSfL https://raw.githubusercontent.com/evilmartians/lefthook/master/install.sh | sh
   ```
2. Включи хуки в репо:
   ```bash
   cd mozgoslav
   lefthook install
   ```

Pre-commit прогонит `dotnet format` / `eslint --fix` / `prettier --write` / `ruff --fix + black` на staged-файлах.

## Где что искать

- `CLAUDE.md` (root) — общая архитектура, конвенции.
- `backend/CLAUDE.md`, `frontend/CLAUDE.md`, `python-sidecar/CLAUDE.md` — гид по каждой части.
- `docs/README.md` — pipeline и устройство.
- `docs/adr/NEXT.md` — активная очередь работы (critical + quick wins).
- `docs/adr/POSTRELEASE.md` — задачи post-v1.0.
- `docs/adr/ADR-014-unrealized-backlog.md` — low-priority backlog.
- `docs/adr/ADR-016-*.md`, `ADR-017-*.md` — Proposed ADR (RAG history, /metrics).
- Shipped/superseded ADR — `.archive/adrs/`. Release plan v0.8 — `.archive/docs/v0.8-release/`.
- Live project status: `README.md` / `CLAUDE.md`.

## Adding a new frontend feature

All new frontend features/slices go through the plop generator so the scaffold stays identical across the repo.

```bash
cd frontend
npm run plop
```

Two generators:

- `feature` — создаёт `src/features/<Name>/` с полной связкой для Container + Presentational паттерна (ADR-012 §2):
    - `<Name>.tsx` — presentational (props only, no API, no fetch)
    - `<Name>.style.ts` — styled-components tokens
    - `<Name>.container.ts` — `connect(mapStateToProps, mapDispatchToProps)` wrapper
    - `types.ts` — props interfaces

- `slice` — создаёт `src/store/slices/<name>/` с полной структурой (ADR-012 §4):
    - `actions.ts` — action creators + action type unions
    - `reducer.ts` — pure reducer switch
    - `selectors.ts` — reselect memoised selectors
    - `saga.ts` — side-effects / API calls

Мы используем plop вместо ручного копирования, чтобы структура не дрейфовала между фичами (`recording` slice —
канонический образец). После генерации: зарегистрируй редьюсер в `src/store/rootReducer.ts`, watcher — в
`src/store/rootSaga.ts`, и экспорт из `src/features/<Name>/index.ts`.

Read-only pages (`Logs`, `Notes viewer`, `DictationOverlay`) остаются hook-based per ADR-012 §2 — для них `feature`
generator не используется.

## Соглашения

- C#: один класс на файл, `sealed` на leaf, `internal` если кросс-проектная видимость не нужна, традиционные
  конструкторы (без primary), `Try`-префикс для методов, возвращающих null. Centralized package management (
  `Directory.Packages.props`).
- Frontend: feature-based (`Component + .style.ts + .container.ts + types.ts`), styled-components, Redux+Saga slices.
  `recording` slice — канонический образец.
- Tests: MSTest + FluentAssertions + NSubstitute (.NET); pytest (python); jest (frontend).

## Подробнее про DMG / релиз

См. `.archive/docs/v0.8-release/07-dmg-and-release.md`. v0.8 ships unsigned; signing/notarisation вынесены в Phase 2 (§8
того же плана).
