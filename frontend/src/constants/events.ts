/**
 * Custom DOM events used as a lightweight pub/sub between features when a
 * shared Redux slice would be overkill. Each constant pairs with a
 * `window.dispatchEvent(new Event(NAME))` emit site and one or more
 * `window.addEventListener(NAME, handler)` listeners.
 */

/** Fired after any user action that added or removed a Recording row. */
export const RECORDINGS_CHANGED_EVENT = "mozgoslav:recordings-changed";
