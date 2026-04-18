# Frontend — guide for AI agents

Electron + React 19 + TypeScript strict + Redux + Redux-Saga + styled-components. Feature-based structure follows the standard React + Redux-Saga pattern.

```
frontend/
├── electron/
│   ├── main.ts         hardened window (contextIsolation, sandbox, CSP via onHeadersReceived), IPC handlers (openAudioFiles, openFolder, openPath)
│   ├── preload.ts      contextBridge whitelist → `window.mozgoslav`
│   └── utils/backendLauncher.ts
├── src/
│   ├── api/
│   │   └── BaseApi.ts + ApiFactory.ts + per-domain *Api.ts                  (Notes, Profiles, Models, Obsidian, Dictation, Sync, Backup, Logs, Jobs, Rag, Health, Meta, Recording, Settings)
│   ├── constants/       routes.ts, api.ts (endpoint registry)
│   ├── core/utils/      formatDuration
│   ├── i18n/            initReactI18next + locales (ru + en)
│   ├── locales/         ru.json, en.json
│   ├── domain/         TS types mirroring the C# domain (single source; legacy `models/` removed by F1)
│   ├── styles/          theme.ts (light/dark), ThemeProvider.tsx, GlobalStyle.ts
│   ├── store/           Redux store + rootReducer + rootSaga + slices/recording (actionCreator + reducer + mutations + selectors + saga)
│   ├── hooks/           useBackendHealth (health ping)
│   ├── components/      shared: Button, Input (password-reveal), ProgressBar (animated), Card, Badge, EmptyState, Layout (sidebar + content)
│   ├── features/        Dashboard, Queue, Notes/{NotesList,NoteViewer}, Profiles, Models, Settings, Logs, Backups
│   ├── App.tsx          routing
│   └── main.tsx         Provider + ThemeProvider + HashRouter + ToastContainer
├── plop-templates/      plop generators for features and store slices
├── vite.config.ts       vite + vite-plugin-electron
├── electron-builder.yml macOS .dmg config (requires macOS host to invoke)
└── package.json         npm scripts: dev, build, typecheck, test, lint, format, plop, dist:mac
```

## Conventions (from the reference React project)

- **Container + Presentational** — `Foo.tsx` receives props, `Foo.container.ts` uses `connect(mapStateToProps, mapDispatchToProps)`. The Dashboard / Queue / etc. pages use direct API calls today for pragmatism; migrate to saga when adding write-paths.
- **Store slice pattern** — `actionCreator.ts` + `reducer.ts` + `mutations.ts` + `selectors.ts` + `saga/*.ts`. Use the `slices/recording` slice as the canonical reference.
- **Styling** — styled-components only; no CSS modules, no Tailwind. Theme tokens in `src/styles/theme.ts`. Dark/light switch via `setThemeMode(...)` — also persisted in Settings.
- **i18n** — every user-facing string goes through `useTranslation`. Add keys to both `ru.json` and `en.json`.
- **Default exports** for components, named exports for utilities/selectors/types.
- **Sensitive inputs** (tokens, API keys) — `<Input sensitive />`. Eye-toggle reveals, never logged.

## Electron bridge

`window.mozgoslav` exposes:
- `openAudioFiles()` → native multi-file picker for supported audio formats
- `openFolder()` → pick a folder (Obsidian vault)
- `openPath(path)` → reveal in Finder

No other privileges are exposed. Add new bridge methods by editing both `preload.ts` (contextBridge) and `main.ts` (ipcMain.handle).

## Testing

- Jest + React Testing Library + `redux-saga-test-plan` (feature-based React style).
- `npm test` runs the suite. `__tests__/` folders sit next to the code they cover.
