---
id: testing-mocks-at-domain-not-transport
status: proposed
audience: agent
---

# testing-mocks-at-domain-not-transport

## context
Frontend feature tests stub `ApiFactory` directly (`recordingStub`, `dictationStub`, `jobsStub`, `settingsStub`). When the transport swaps from REST to gql, every stub rewrites.

## problem
- Six+ component test files (`Notes`, `Home`, `Obsidian`, `Dashboard`, `Queue`, `Sync`) mock at the API-factory layer.
- REST→GraphQL migration forced parallel rewrites of `testUtils/mockApi.ts` and every consumer.
- The asserted behaviour (component renders state from a successful fetch) is transport-independent — the test code should not care.

## proposal
- Mocks live at the use-case / saga-action level, not at the transport client.
- `testUtils/mockState.ts` exposes factory functions for store slices in known states (e.g. «recordings loaded», «notes empty», «job in progress»).
- Components are tested against rendered Redux state; tests dispatch real actions that go through real reducers; only the saga's call to the API is intercepted (via `redux-saga-test-plan` `provide`).
- Tests that genuinely need transport (auth flows, retry behaviour) keep transport mocks but live in a separate `transport-tests/` folder, opt-in.

## acceptance
- [ ] grep `apiFactory|graphqlClient|axios` over `src/**/__tests__/**` returns zero hits outside of `transport-tests/`.
- [ ] Future transport swaps require zero changes under `__tests__/`.
- [ ] `testUtils/mockState.ts` is the documented entry point for component-level mocking.
- [ ] CLAUDE.md updated with the policy.

## rejected
| alt | reason |
|---|---|
| MSW (Mock Service Worker) at network layer | catches more, but couples tests to network shape; rewrites on every API tweak. |
| Per-test inline mocks | sprawl; same fragility, distributed. |
| Stub each Api class via `jest.mock()` per test | what we have today — the problem statement. |
