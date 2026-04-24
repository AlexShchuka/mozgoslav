import type { HotkeyEventFrame } from "./types";

export const SUBSCRIBE_HOTKEYS = "hotkeys/SUBSCRIBE";
export const UNSUBSCRIBE_HOTKEYS = "hotkeys/UNSUBSCRIBE";
export const HOTKEY_PRESSED = "hotkeys/PRESSED";
export const HOTKEY_RELEASED = "hotkeys/RELEASED";
export const HOTKEYS_STREAM_OPENED = "hotkeys/STREAM_OPENED";
export const HOTKEYS_STREAM_CLOSED = "hotkeys/STREAM_CLOSED";

export interface SubscribeHotkeysAction {
  type: typeof SUBSCRIBE_HOTKEYS;
}

export interface UnsubscribeHotkeysAction {
  type: typeof UNSUBSCRIBE_HOTKEYS;
}

export interface HotkeyPressedAction {
  type: typeof HOTKEY_PRESSED;
  payload: HotkeyEventFrame;
}

export interface HotkeyReleasedAction {
  type: typeof HOTKEY_RELEASED;
  payload: HotkeyEventFrame;
}

export interface HotkeysStreamOpenedAction {
  type: typeof HOTKEYS_STREAM_OPENED;
}

export interface HotkeysStreamClosedAction {
  type: typeof HOTKEYS_STREAM_CLOSED;
}

export type HotkeysAction =
  | SubscribeHotkeysAction
  | UnsubscribeHotkeysAction
  | HotkeyPressedAction
  | HotkeyReleasedAction
  | HotkeysStreamOpenedAction
  | HotkeysStreamClosedAction;

export const subscribeHotkeys = (): SubscribeHotkeysAction => ({ type: SUBSCRIBE_HOTKEYS });
export const unsubscribeHotkeys = (): UnsubscribeHotkeysAction => ({ type: UNSUBSCRIBE_HOTKEYS });
export const hotkeyPressed = (frame: HotkeyEventFrame): HotkeyPressedAction => ({
  type: HOTKEY_PRESSED,
  payload: frame,
});
export const hotkeyReleased = (frame: HotkeyEventFrame): HotkeyReleasedAction => ({
  type: HOTKEY_RELEASED,
  payload: frame,
});
export const hotkeysStreamOpened = (): HotkeysStreamOpenedAction => ({
  type: HOTKEYS_STREAM_OPENED,
});
export const hotkeysStreamClosed = (): HotkeysStreamClosedAction => ({
  type: HOTKEYS_STREAM_CLOSED,
});
