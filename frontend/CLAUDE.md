# frontend

Electron + React 19 + TS strict + Redux-Saga + styled-components + i18next.

## commands

```bash
npm ci
npm run dev
npm run build
npm run typecheck
npm run lint
npm test -- --watchAll=false
npx prettier --check "src/**/*.{ts,tsx,css}" "electron/**/*.ts"
```

## conventions

- Container + Presentational: `Foo.tsx` (props only) + `Foo.container.ts` (`connect(...)`).
- Store slices: `actions.ts` + `reducer.ts` + `mutations.ts` + `selectors.ts` + `saga/*.ts`.
- styled-components only; no inline CSS, Tailwind, CSS modules.
- Every user-facing string via `useTranslation`; keys in both `ru.json` and `en.json`.
- Sensitive inputs via the `<Input sensitive />` primitive; never logged.
- New feature or slice → `npm run plop`, never hand-scaffold.
