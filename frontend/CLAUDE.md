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

## Local dev quick-start

`npm run dev` launches Electron with `cwd=frontend/`, so `process.cwd()` does not
point at the repo root. Sidecar launchers walk up via `electron/utils/repoRoot.ts`
(sentinel: `frontend/package.json` name `mozgoslav` + sibling `python-sidecar/`).
Set `MOZGOSLAV_REPO_ROOT=/abs/path/to/repo` to override.

Bring up the supporting processes once per machine, then start the app:

```bash
bash python-sidecar/launch.sh
bash searxng-sidecar/launch.sh
bash scripts/fetch-syncthing.sh
npm run dev
```

## conventions

- Container + Presentational: `Foo.tsx` (props only) + `Foo.container.ts` (`connect(...)`).
- Store slices: `actions.ts` + `reducer.ts` + `mutations.ts` + `selectors.ts` + `saga/*.ts`.
- styled-components only; no inline CSS, Tailwind, CSS modules.
- Every user-facing string via `useTranslation`; keys in both `ru.json` and `en.json`.
- Sensitive inputs via the `<Input sensitive />` primitive; never logged.
- New feature or slice → `npm run plop`, never hand-scaffold.
- Transport policy (per #120): components and hooks never import `graphqlClient`
  or `getGraphqlWsClient`. All GraphQL operations go through Redux-Saga: a
  component/hook dispatches an action triple (`*Requested` / `*Succeeded` /
  `*Failed`), a saga owns the `graphqlClient.request`, reducer reflects the
  outcome, selectors expose the state. Tests preload state via
  `testUtils/mockState.ts` helpers and assert via `renderWithStore`'s
  `getActions()`; no `jest.mock("graphqlClient")` under `src/features/**/__tests__/`
  or `src/components/**/__tests__/`. The sole legitimate REST caller remains
  `src/api/dictationPush.ts` (binary audio push).
