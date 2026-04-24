---
id: testing-e2e-smoke-suite
status: proposed
audience: agent
---

# testing-e2e-smoke-suite

## context
«Backend tests green + frontend tests green» does not catch runtime integration failures (component → API path mismatches, broken supervisor lifecycle, missing native helpers).

## problem
- The REST→GraphQL Phase 12 cutover would have left every feature page 404-ing on real run, despite both backend and frontend test suites being green at that commit.
- Component-level tests mock the transport. The actual «open the app, click each nav, verify no network errors» check happens manually, if at all.
- Pure unit/integration tests cannot exercise the Electron supervisor + IPC + real backend boot path.

## proposal
- Playwright (or equivalent) e2e suite that boots the Electron app against a temp SQLite database and walks 5–8 critical paths:
  - Open each top-level nav route.
  - Trigger one mutation per domain (create note, create backup, reindex rag, start dictation, upload recording).
  - Listen for `console.error` and unhandled `network 4xx/5xx` events; fail on any.
- Run on every PR and as the final exit step in multi-phase migrations.
- Native helper bits stub-out gracefully on the runner OS (Linux runner uses `PlatformUnsupportedAudioRecorder` already).

## acceptance
- [ ] `frontend/e2e/` exists with a `smoke.spec.ts` covering the documented critical paths.
- [ ] `npm run smoke` boots app + runs suite + exits zero / non-zero.
- [ ] CI runs `npm run smoke` on every PR.
- [ ] Multi-phase migration checklists list `smoke` as a mandatory exit step.

## rejected
| alt | reason |
|---|---|
| Manual smoke checklist | no enforcement; rots; silent regressions. |
| Component-level integration tests in jsdom | cannot exercise real Electron + IPC + supervisor path. |
| Cypress | native Electron support weaker than Playwright in current versions. |
