import type { Reducer } from "redux";

import { HOTKEY_PRESSED, HOTKEY_RELEASED, type HotkeysAction } from "./actions";
import { initialHotkeysState, type HotkeysState } from "./types";

export const hotkeysReducer: Reducer<HotkeysState> = (
  state: HotkeysState = initialHotkeysState,
  action
): HotkeysState => {
  const typed = action as HotkeysAction;
  switch (typed.type) {
    case HOTKEY_PRESSED:
      return { ...state, lastPress: typed.payload, sequence: state.sequence + 1 };
    case HOTKEY_RELEASED:
      return { ...state, lastRelease: typed.payload, sequence: state.sequence + 1 };
    default:
      return state;
  }
};
