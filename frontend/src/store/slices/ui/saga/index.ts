import type {SagaIterator} from "redux-saga";

/**
 * The UI slice currently has no async side-effects — theme changes and
 * modal state land straight in the reducer. A placeholder watcher keeps the
 * saga-structure parity with other slices (ADR-012 item 4) so a future
 * async concern (e.g. persisting theme to settings, animating toasts) slots
 * in without extra wiring.
 */
export function* watchUiSagas(): SagaIterator {
}
