import type { GlobalState } from "../../rootReducer";
import type { HotkeyEventFrame } from "./types";

export const selectLastHotkeyPress = (state: GlobalState): HotkeyEventFrame | null =>
  state.hotkeys.lastPress;

export const selectLastHotkeyRelease = (state: GlobalState): HotkeyEventFrame | null =>
  state.hotkeys.lastRelease;
